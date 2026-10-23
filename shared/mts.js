import {validateTransaction} from './schema.js';
import {parsePurchaseSummary} from './purchase-import.js';
// Conservative, text-only MTS table parser. Unknown layouts are review drafts.
// Never infer units/currency from provider name or filename.
const cleanNumber=s=>s?.replace(/,/g,'')||'';
export function parseDate(s){
 let m=s.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(m)return s;
 m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);if(!m)return '';
 let y=+m[3];if(y>2400)y-=543;return `${y}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;
}
export function parseMts(text){
 const purchase=parsePurchaseSummary(text);if(purchase)return purchase;
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const supported=/MTS|แม่ทองสุก/i.test(text)&&/Daily\s*Statement|รายงานประจำวัน/i.test(text);
 const currencies=[['THB',/\bTHB\b|บาทไทย/i],['USD',/\bUSD\b/i],['EUR',/\bEUR\b/i]].filter(([,re])=>re.test(text)).map(([code])=>code);
 const unitMatches=[['baht',/\bbaht\b|บาททอง/i],['g',/\b(?:gram|grams|g)\b|(?<!กิโล)กรัม/i],['oz',/\b(?:oz|ounce)\b/i],['kg',/\bkg\b|กิโลกรัม/i]].filter(([,re])=>re.test(text)).map(([code])=>code);
 const goldMatches=[...new Set([...text.matchAll(/\b(99\.99|96\.5)\s*%/g)].map(m=>m[1]+'%'))];
 const currency=currencies.length===1?currencies[0]:'';
 const unit=unitMatches.length===1?unitMatches[0]:'';
 const goldType=goldMatches.length===1?goldMatches[0]:'';
 const dated=lines.find(l=>/statement\s*date|วันที่รายงาน|ประจำวันที่/i.test(l));
 const documentDate=parseDate(dated?.match(/\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4}/)?.[0]||'');
 const transactions=[],sourceRows=[],warnings=[];
 if(currencies.length>1||unitMatches.length>1||goldMatches.length>1)warnings.push('พบหลายสกุลเงิน หน่วย หรือประเภททองในเอกสาร ต้องเลือกค่าของแต่ละแถวจากต้นฉบับเอง');
 if(!supported)warnings.push('ไม่รู้จักรูปแบบเอกสาร: กรุณาตรวจหรือกรอกข้อมูลด้วยมือ');
 // Recognized variant: date time BUY/SELL reference weight price amount [fee].
 const row=/^(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})\s+(\d{2}:\d{2}(?::\d{2})?)\s+(BUY|SELL|ซื้อ|ขาย)\s+([A-Za-z0-9_/-]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)(?:\s+([\d,.]+))?$/i;
 if(supported)for(const line of lines){
   const m=line.match(row);if(!m){if(/\bBUY\b|\bSELL\b|ซื้อ|ขาย/i.test(line)&&/\d/.test(line))warnings.push('พบบรรทัดซื้อ/ขายที่แยกไม่ได้ กรุณาเพิ่มรายการที่ขาดจากข้อความต้นฉบับ');continue;}
   const t={id:crypto.randomUUID(),date:parseDate(m[1])+'T'+m[2],type:/BUY|ซื้อ/i.test(m[3])?'buy':'sell',provider:'MTS',reference:m[4],goldType,weight:cleanNumber(m[5]),unit,unitPrice:cleanNumber(m[6]),amount:cleanNumber(m[7]),currency,fee:cleanNumber(m[8])||'0'};
   transactions.push(t);sourceRows.push(line);
 }
 if(!transactions.length)warnings.push('อ่านข้อความได้แล้ว แต่ยังแยกคอลัมน์ธุรกรรมไม่ได้ กรุณากรอกหรือตรวจข้อมูลจากต้นฉบับ');
 for(const t of transactions)warnings.push(...validateTransaction(t));
 const snapshots=[];
 const opening=lines.find(l=>/^(?:Opening Balance|ยอดยกมา)\s*[:=]?\s*[\d,.]+$/i.test(l));
 const closing=lines.find(l=>/^(?:Closing Balance|ยอดคงเหลือ)\s*[:=]?\s*[\d,.]+$/i.test(l));
 const avg=lines.find(l=>/^(?:Average Price|ราคาเฉลี่ย)\s*[:=]?\s*[\d,.]+$/i.test(l));
 if(supported&&documentDate&&opening&&closing&&currency&&unit&&goldType)snapshots.push({id:crypto.randomUUID(),date:documentDate,provider:'MTS',goldType,unit,currency,opening:cleanNumber(opening.match(/[\d,.]+$/)[0]),closing:cleanNumber(closing.match(/[\d,.]+$/)[0]),average:avg?cleanNumber(avg.match(/[\d,.]+$/)[0]):null,openingAverage:null});
 if(!snapshots.length)warnings.push('ยังไม่มีสรุปยอดยกมา/คงเหลือที่ตรวจได้ กรุณาตรวจต้นฉบับและเพิ่มสรุปรายวันหากมี');
 return {transactions,snapshots,warnings:[...new Set(warnings)],sourceRows,supported};
}
// Only known complete numeric trade rows may leave the device.
// References are replaced by aliases; names, accounts and arbitrary text cannot pass.
export function safeAiTable(transactions){
 return transactions.map((t,i)=>{
   if(validateTransaction(t).length)throw new Error('กรอกธุรกรรมให้ครบก่อนจัดตารางสำหรับ AI');
   return `${i+1}\t${t.date}\t${t.type}\tROW_${i+1}\t${t.weight}\t${t.unitPrice}\t${t.amount}\t${t.fee}\t${t.unit}\t${t.currency}`;
 }).join('\n');
}
export function validateSafeTable(text){
 if(!text||text.length>40000)throw new Error('ตารางต้องมีข้อมูลและไม่เกิน 40,000 ตัวอักษร');
 const regex=/^\d+\t\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?\t(?:buy|sell)\tROW_\d+\t\d+(?:\.\d+)?\t\d+(?:\.\d+)?\t\d+(?:\.\d+)?\t\d+(?:\.\d+)?\t(?:g|baht|oz|kg)\t(?:THB|USD|EUR)$/;
 if(!text.split('\n').every(l=>regex.test(l)))throw new Error('อนุญาตเฉพาะตารางตัวเลขที่ลบข้อมูลส่วนตัวแล้ว');
 return text;
}
