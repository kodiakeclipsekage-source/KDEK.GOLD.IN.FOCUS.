import Decimal from 'decimal.js';
import {snapshotSchema,validateTransaction,groupKey} from './schema.js';

// The import form contains only the seven values requested for GLDOZUSD.
export const blankPurchase=()=>({date:'',goldType:'GLDOZUSD',weight:'',unitPrice:'',amount:'',closing:'',average:''});
const normalized=v=>{try{return new Decimal(v).toString();}catch{return v;}};
function reference(value){
 const key=JSON.stringify([value.date,value.goldType,...['weight','unitPrice','amount'].map(k=>normalized(value[k]))]);
 let hash=0xcbf29ce484222325n;for(const c of key)hash=BigInt.asUintN(64,(hash^BigInt(c.charCodeAt(0)))*0x100000001b3n);
 return 'MTS-IMPORT-'+hash.toString(16).padStart(16,'0');
}
export function purchaseRecords(value,original=null,snapshot=null){
 const transaction={id:original?.id||crypto.randomUUID(),date:value.date,type:'buy',provider:original?.provider||'MTS',reference:original?.reference||reference(value),goldType:value.goldType,weight:value.weight,unit:'oz',unitPrice:value.unitPrice,amount:value.amount,currency:'USD',fee:original?.fee||'0'};
 const summary={id:snapshot?.id||crypto.randomUUID(),date:value.date.slice(0,10),provider:transaction.provider,goldType:value.goldType,unit:'oz',currency:'USD',opening:snapshot?.opening??null,closing:value.closing,average:value.average||null,openingAverage:snapshot?.openingAverage??null};
 return {transaction,summary};
}
export function validatePurchase(value){
 const errors=[];
 if(value.goldType!=='GLDOZUSD')errors.push('รูปแบบนำเข้านี้รองรับ GLDOZUSD (OZ / USD)');
 const {transaction,summary}=purchaseRecords(value);
 errors.push(...validateTransaction(transaction));
 if(!value.average)errors.push('กรุณากรอกราคาเฉลี่ยคงเหลือ');
 const result=snapshotSchema.safeParse(summary);if(!result.success)errors.push(...result.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`));
 return errors;
}
export function snapshotFor(transaction,snapshots){return snapshots.find(s=>s.date===transaction.date.slice(0,10)&&groupKey(s)===groupKey(transaction));}
export function purchaseValue(transaction,snapshot){return {date:transaction.date,goldType:transaction.goldType,weight:transaction.weight,unitPrice:transaction.unitPrice,amount:transaction.amount,closing:snapshot?.closing??'',average:snapshot?.average??''};}
export function upsertPurchase(draft,value,original=null,previousSummary=null){
 const remaining=draft.transactions.filter(t=>t.id!==original?.id);
 const initial=purchaseRecords(value,original);
 const target=snapshotFor(initial.transaction,draft.snapshots);
 const shared=previousSummary&&remaining.some(t=>snapshotFor(t,[previousSummary]));
 const {transaction,summary}=purchaseRecords(value,original,target||(!shared?previousSummary:null));
 return {...draft,transactions:[...remaining,transaction],snapshots:[...draft.snapshots.filter(s=>s.id!==target?.id&&(shared||s.id!==previousSummary?.id)),summary]};
}
export function removePurchase(draft,transaction,snapshot){
 const transactions=draft.transactions.filter(t=>t.id!==transaction.id);
 const shared=snapshot&&transactions.some(t=>snapshotFor(t,[snapshot]));
 return {...draft,transactions,snapshots:draft.snapshots.filter(s=>shared||s.id!==snapshot?.id)};
}
// Formatting never rounds the five-decimal OZ values or changes the printed scale.
export function documentNumber(value){if(value===null||value===undefined||value==='')return '—';const [whole,fraction]=String(value).split('.');return whole.replace(/\B(?=(\d{3})+(?!\d))/g,',')+(fraction===undefined?'':'.'+fraction);}
export function documentDate(value){if(!value)return '—';const [date,time]=value.split('T');const [year,month,day]=date.split('-');return `${day}/${month}/${year}${time?' เวลา '+time:''}`;}

function labelled(text,labels){
 const match=text.match(new RegExp(`(?:^|\\n)\\s*\\|?\\s*(?:${labels})\\s*(?:[:：|]\\s*)?([^\\n|]+)`,'i'));
 return match?.[1]?.trim()||'';
}
const number=value=>value.match(/\d[\d,]*(?:\.\d+)?/)?.[0].replace(/,/g,'')||'';
const isoDate=value=>{
 const match=value.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})\s*(?:(?:เวลา|Time)\s*[:：]?\s*)?(\d{2}:\d{2}(?::\d{2})?)/i);
 if(match){let year=+match[3];if(year>2400)year-=543;return `${year}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}T${match[4]}`;}
 return value.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?/)?.[0]||'';
};
export function parsePurchaseSummary(text){
 text=text.replace(/[\u200b\u200c\u200d\ufeff]/g,'').replace(/\u00a0/g,' ');
 if(!/\bGLDOZUSD\b/i.test(text))return null;
 const rows=parseMtsStatementRows(text);if(rows)return rows;
 const columns=parseMtsColumns(text);if(columns)return columns;
 const dateText=labelled(text,'วันที่ซื้อ|Purchase Date');
 const value={date:isoDate(dateText),goldType:'GLDOZUSD',weight:number(labelled(text,'น้ำหนักซื้อ|Purchase Weight')),unitPrice:number(labelled(text,'ราคาต่อหน่วย|Unit Price')),amount:number(labelled(text,'จำนวนเงินซื้อ|Purchase Amount')),closing:number(labelled(text,'ทองคงเหลือสิ้นวัน|Closing Balance')),average:number(labelled(text,'ราคาเฉลี่ยคงเหลือ|Average Price'))};
 if(!dateText&&!value.weight&&!value.amount)return parsePurchaseRows(text,value);
 const {transaction,summary}=purchaseRecords(value);
 return {transactions:[transaction],snapshots:[summary],warnings:validatePurchase(value),sourceRows:[],supported:true};
}

// PDF.js reconstructs the printed MTS table into rows. Blank sell/outgoing
// cells disappear from extracted text, so verify both tables and their totals.
// Keep the existing column-order reader for PDFs with a different text order.
function parseMtsStatementRows(text){
 const lines=text.split(/\r?\n/).map(line=>line.replace(/\s+/g,' ').trim()).filter(Boolean);
 const tradeStart=lines.indexOf('รายการซื้อขาย'),movementStart=lines.indexOf('สรุปรายการเคลื่อนไหว');
 if(tradeStart<0||movementStart<=tradeStart)return null;
 const trades=lines.slice(tradeStart+1,movementStart),movement=lines.slice(movementStart+1);
 const tradeRows=trades.filter(line=>/^GLD[A-Z]+\s+\d{1,2}[/-]/.test(line));
 if(!tradeRows.length)return null;
 const unsupported=message=>({transactions:[],snapshots:[],warnings:[message],sourceRows:[],supported:true});
 const reject=()=>unsupported('ยังจับคู่แถวซื้อขายกับสรุปการเคลื่อนไหวไม่ได้ครบ กรุณาตรวจข้อมูล 7 ช่อง');
 const products=[...new Set([...text.matchAll(/\bGLD[A-Z]+\b/g)].map(match=>match[0]))];
 if(tradeRows.length!==1||products.length!==1||products[0]!=='GLDOZUSD')return unsupported('ตารางแบบแถวนี้รองรับรายการซื้อ GLDOZUSD เดียว กรุณาตรวจหลายรายการด้วยมือ');
 if(trades[0]!=='ประเภททองคำ วันที่ เลขที่รายการ น้ำหนักซื้อ น้ำหนักขาย ราคาต่อหน่วย จำนวนเงินซื้อ จำนวนเงินขาย'
   ||movement[0]!=='ประเภททองคำ วันที่ เลขที่รายการ รายการ รายการขาเข้า รายการขาออก คงเหลือ'
   ||movement[1]!=='น้ำหนัก ราคาต่อหน่วย น้ำหนัก ราคาต่อหน่วย น้ำหนัก ราคาเฉลี่ย')return reject();
 const n='(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
 const date='(\\d{1,2}[/-]\\d{1,2}[/-]\\d{4} \\d{2}:\\d{2}(?::\\d{2})?)';
 const trade=tradeRows[0].match(new RegExp('^GLDOZUSD '+date+' (GPB\\d+) ('+n+') ('+n+') ('+n+')$'));
 const checkpoints=movement.filter(line=>/^GLD[A-Z]+\s+B\/F\b/.test(line));
 const changes=movement.filter(line=>/\bGP[BS]\d+\b/.test(line));
 if(!trade||checkpoints.length!==1||changes.length!==1||trades.filter(line=>/\bGP[BS]\d+\b/.test(line)).length!==1
   ||trades.filter(line=>/^GLD[A-Z]+\b/.test(line)).length!==1||movement.filter(line=>/^GLD[A-Z]+\b/.test(line)).length!==2)return reject();
 const opening=checkpoints[0].match(new RegExp('^GLDOZUSD B/F ('+n+') ('+n+')$'));
 const change=changes[0].match(new RegExp('^GLDOZUSD '+date+' (GPB\\d+) BUY ('+n+') ('+n+') ('+n+') ('+n+')$'));
 if(!opening||!change||isoDate(trade[1])!==isoDate(change[1])||trade[2]!==change[2])return reject();
 const number=value=>value.replace(/,/g,'');
 const eq=(a,b)=>new Decimal(number(a)).eq(number(b));
 if(!eq(trade[3],change[3])||!eq(trade[4],change[4]))return reject();
 const totals=(section,count)=>{
  const pattern=new RegExp('^'+n+'(?: '+n+'){'+(count-1)+'}$');
  return section.filter(line=>pattern.test(line)).map(line=>line.split(' '));
 };
 const tradeTotals=totals(trades,4),movementTotals=totals(movement,2);
 if(tradeTotals.length!==1||movementTotals.length!==1)return reject();
 const [buyWeight,sellWeight,buyAmount,sellAmount]=tradeTotals[0];
 const [incoming,outgoing]=movementTotals[0];
 if(!eq(buyWeight,trade[3])||!eq(buyAmount,trade[5])||!eq(incoming,trade[3])||!eq(sellWeight,'0')||!eq(sellAmount,'0')||!eq(outgoing,'0'))return reject();
 const value={date:isoDate(trade[1]),goldType:'GLDOZUSD',weight:number(trade[3]),unitPrice:number(trade[4]),amount:number(trade[5]),closing:number(change[5]),average:number(change[6])};
 const {transaction,summary}=purchaseRecords(value);
 transaction.reference=trade[2];
 summary.opening=number(opening[1]);summary.openingAverage=number(opening[2]);
 const warnings=validatePurchase(value);
 if(!new Decimal(summary.opening).plus(value.weight).eq(value.closing))warnings.push('พบบรรทัดยอดคงเหลือที่ไม่ตรงกับยอดยกมาและน้ำหนักซื้อ กรุณาตรวจต้นฉบับ');
 const units=lines.slice(0,tradeStart).filter(line=>/^GLDOZUSD\s/.test(line));
 if(units.length!==1||!units[0].match(new RegExp('^GLDOZUSD ('+n+') OZ$')))return reject();
 if(!eq(units[0].split(' ')[1],value.closing))warnings.push('พบบรรทัดจำนวนหน่วยที่ไม่ตรงกับยอดคงเหลือ กรุณาตรวจต้นฉบับ');
 return {transactions:[transaction],snapshots:[summary],warnings,sourceRows:[],supported:true};
}

// MTS PDF can emit columns in reading order instead of complete table rows.
// This variant is deliberately limited to one BUY plus its B/F checkpoint.
function parseMtsColumns(text){
 const flat=text.replace(/\s+/g,' ').trim();
 const parts=flat.split(/สรุปรายการเคลื่อนไหว/);
 if(parts.length!==2||!parts[0].includes('รายการซื้อขาย'))return null;
 const trade=parts[0].split('รายการซื้อขาย')[1],movement=parts[1];
 const unsupported=message=>({transactions:[],snapshots:[],warnings:[message],sourceRows:[],supported:true});
 const refs=[...new Set([...trade.matchAll(/\bGP[BS]\d+\b/g)].map(m=>m[0]))];
 const movementRefs=[...new Set([...movement.matchAll(/\bGP[BS]\d+\b/g)].map(m=>m[0]))];
 const products=[...new Set([...flat.matchAll(/\bGLD[A-Z]+\b/g)].map(m=>m[0]))];
 if(refs.length!==1||movementRefs.length!==1||refs[0]!==movementRefs[0]||products.length!==1||products[0]!=='GLDOZUSD')return unsupported('ตารางแบบคอลัมน์มีหลายรายการหรือข้อมูลอ้างอิงไม่ตรงกัน กรุณาตรวจข้อมูล 7 ช่องด้วยมือ');
 if(!/\bB\/F\b/.test(movement)||(movement.match(/\bBUY\b/g)||[]).length!==1||/\bSELL\b/.test(movement))return unsupported('รูปแบบ 7 ช่องนี้ต้องเป็นรายการซื้อเดียวพร้อมยอดยกมา กรุณาตรวจประเภทของรายการ');
 const datePattern=/\d{1,2}[/-]\d{1,2}[/-]\d{4}\s+\d{2}:\d{2}(?::\d{2})?/g;
 const dates=[...new Set((flat.match(datePattern)||[]).map(isoDate))];
 if(dates.length!==1)return unsupported('พบวันเวลาหลายรายการที่ยังจับคู่ไม่ได้ กรุณาตรวจวันที่ซื้อ');
 const n='\\d[\\d,]*\\.\\d+';
 const listAfter=(section,label)=>{
  const block=section.match(new RegExp(label+'\\s+((?:'+n+'\\s*)+)'))?.[1]||'';
  return (block.match(new RegExp(n,'g'))||[]).map(v=>v.replace(/,/g,''));
 };
 const weights=listAfter(trade,'น้ำหนักซื้อ');
 const amounts=listAfter(flat,'จำนวนเงินซื้อ');
 const prices=[...flat.matchAll(new RegExp('ราคาต่อหน่วย\\s+('+n+')','g'))].map(m=>m[1].replace(/,/g,''));
 const balances=movement.match(new RegExp('น้ำหนัก\\s+('+n+')\\s+('+n+')\\s+OZ\\b','i'));
 const averages=movement.match(new RegExp('คงเหลือ\\s+ราคาเฉลี่ย\\s+('+n+')\\s+('+n+')'));
 const outgoing=movement.match(new RegExp('รายการขาออก\\s+น้ำหนัก\\s+('+n+')'));
 const saleAmounts=listAfter(flat,'จำนวนเงินขาย');
 const oneValue=values=>values.length>0&&values.length<=2&&values.every(v=>new Decimal(v).eq(values[0]));
 if(!oneValue(weights)||!oneValue(amounts)||!oneValue(prices)||!balances||!averages||!outgoing||!new Decimal(outgoing[1].replace(/,/g,'')).isZero()||saleAmounts.some(v=>!new Decimal(v).isZero()))return unsupported('ยังจับคู่คอลัมน์น้ำหนัก ราคา ยอดเงิน หรือยอดคงเหลือไม่ได้ครบ กรุณาตรวจข้อมูล 7 ช่อง');
 const value={date:dates[0],goldType:'GLDOZUSD',weight:weights[0],unitPrice:prices[0],amount:amounts[0],closing:balances[2].replace(/,/g,''),average:averages[2].replace(/,/g,'')};
 const {transaction,summary}=purchaseRecords(value);
 transaction.reference=refs[0];
 summary.opening=balances[1].replace(/,/g,'');
 summary.openingAverage=averages[1].replace(/,/g,'');
 const warnings=validatePurchase(value);
 if(!new Decimal(summary.opening).plus(value.weight).eq(value.closing))warnings.push('พบบรรทัดยอดคงเหลือที่ไม่ตรงกับยอดยกมาและน้ำหนักซื้อ กรุณาตรวจต้นฉบับ');
 const units=movement.match(new RegExp('จำนวนหน่วย\\s+('+n+')'))?.[1];
 if(units&&!new Decimal(units.replace(/,/g,'')).eq(value.closing))warnings.push('พบบรรทัดจำนวนหน่วยที่ไม่ตรงกับยอดคงเหลือ กรุณาตรวจต้นฉบับ');
 return {transactions:[transaction],snapshots:[summary],warnings,sourceRows:[],supported:true};
}

// Explicit BUY rows only. Unknown column orders remain for human review.
function parsePurchaseRows(text,summary){
 const date='(\\d{1,2}[/-]\\d{1,2}[/-]\\d{4})';
 const time='(\\d{2}:\\d{2}(?::\\d{2})?)';
 const numeric='([\\d,]+(?:\\.\\d+)?)';
 const pattern=new RegExp('^'+date+'\\s+'+time+'\\s+(?:GLDOZUSD\\s+(?:BUY|ซื้อ)|(?:BUY|ซื้อ)\\s+GLDOZUSD)\\s+'+numeric+'(?:\\s+OZ)?\\s+'+numeric+'\\s+'+numeric+'$','i');
 const values=[],unmatched=[];
 for(const line of text.split(/\r?\n/).map(s=>s.trim())){
  const m=line.match(pattern);
  if(m)values.push({...summary,date:isoDate(m[1]+' '+m[2]),goldType:'GLDOZUSD',weight:m[3].replace(/,/g,''),unitPrice:m[4].replace(/,/g,''),amount:m[5].replace(/,/g,'')});
  else if(/GLDOZUSD/i.test(line)&&/\bBUY\b|\bSELL\b|ซื้อ|ขาย/i.test(line)&&/\d/.test(line))unmatched.push(line);
 }
 if(!values.length)return null;
 const oneDay=new Set(values.map(v=>v.date.slice(0,10))).size===1;
 const transactions=[],snapshots=new Map(),warnings=[];
 for(const value of values){
  if(!oneDay){value.closing='';value.average='';}
  const {transaction,summary:snapshot}=purchaseRecords(value);transactions.push(transaction);snapshots.set(snapshot.date,snapshot);warnings.push(...validatePurchase(value));
 }
 if(unmatched.length)warnings.push('พบบรรทัดซื้อ/ขายที่แยกไม่ได้ '+unmatched.length+' บรรทัด กรุณาตรวจรายการที่ขาดจากข้อความต้นฉบับ');
 return {transactions,snapshots:[...snapshots.values()],warnings:[...new Set(warnings)],sourceRows:[],supported:true};
}
