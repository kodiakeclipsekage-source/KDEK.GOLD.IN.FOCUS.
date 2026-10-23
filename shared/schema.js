import { z } from 'zod';
import Decimal from 'decimal.js';
Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export const dec = z.string().regex(/^\d{1,15}(\.\d{1,8})?$/, 'ใช้เลขบวก ทศนิยมไม่เกิน 8 ตำแหน่ง');
const positive = dec.refine(v=>new Decimal(v).gt(0),'ต้องมากกว่าศูนย์');
const short = z.string().trim().min(1,'กรุณากรอกข้อมูล').max(100);
export const day = z.iso.date();
export const transactionSchema = z.object({
  id:z.string().min(1).max(100), date:z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/).refine(v=>day.safeParse(v.slice(0,10)).success && Number(v.slice(11,13))<24 && Number(v.slice(14,16))<60 && (!v.slice(17)||Number(v.slice(17))<60),'วันเวลาไม่ถูกต้อง'),
  type:z.enum(['buy','sell']), provider:short, reference:short, goldType:short,
  weight:positive, unit:z.enum(['g','baht','oz','kg']), unitPrice:positive,
  amount:positive, currency:z.enum(['THB','USD','EUR']), fee:dec,
}).strict();
export const snapshotSchema=z.object({
  id:z.string().max(100),date:day,provider:short,goldType:short,
  unit:z.enum(['g','baht','oz','kg']),currency:z.enum(['THB','USD','EUR']),
  opening:dec.nullable(),closing:dec,average:dec.nullable(),openingAverage:dec.nullable(),
}).strict();
export const historySchema=z.object({id:z.string().max(100),at:z.iso.datetime(),count:z.number().int().min(0),duplicates:z.number().int().min(0),source:z.enum(['pdf','json']),status:z.literal('confirmed')}).strict();
export const ledgerSchema=z.object({schemaVersion:z.literal(1),transactions:z.array(transactionSchema).max(2000),snapshots:z.array(snapshotSchema).max(2000),imports:z.array(historySchema).max(2000)}).strict();
export const emptyLedger=()=>({schemaVersion:1,transactions:[],snapshots:[],imports:[]});
export const groupKey=t=>JSON.stringify([t.provider,t.goldType,t.unit,t.currency]);
export const identity=t=>JSON.stringify([t.provider,t.reference]);
const norm=v=>new Decimal(v).toString();
export function canonical(t) {
  return JSON.stringify(Object.fromEntries(Object.entries(t).filter(([k])=>k!=='id').map(([k,v])=>[k,['weight','unitPrice','amount','fee','opening','closing','average','openingAverage'].includes(k)&&v!==null?norm(v):k==='date'&&v.includes('T')?v.padEnd(19,':00'):v]).sort(([a],[b])=>a.localeCompare(b))));
}
export function validateTransaction(value){
  const r=transactionSchema.safeParse(value);
  if(!r.success) return r.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`);
  const expected=new Decimal(value.weight).mul(value.unitPrice);
  // Printed amounts may be rounded to 2 decimals. Fee is separate, not included in amount.
  return expected.minus(value.amount).abs().gt('0.01') ? ['ยอดเงินไม่ตรงกับน้ำหนัก × ราคาต่อหน่วย (เกิน 0.01); โปรดตรวจหน่วยและยอดก่อนบันทึก'] : [];
}
export function mergeLedger(current,incoming){
  const base=ledgerSchema.parse(current), next=ledgerSchema.parse(incoming);
  let duplicates=0;
  const merge=(old,rows,key)=>{
    const map=new Map(old.map(t=>[key(t),t]));
    for(const t of rows){const k=key(t), prior=map.get(k);
      if(prior){if(canonical(prior)!==canonical(t)) throw new Error('พบข้อมูลขัดแย้งกับรายการเดิม กรุณาแก้ไขด้วยมือ: '+(t.reference||t.date));duplicates++;}
      else map.set(k,t);
    }
    return [...map.values()];
  };
  const transactions=merge(base.transactions,next.transactions,identity);
  const snapshots=merge(base.snapshots,next.snapshots,s=>JSON.stringify([groupKey(s),s.date]));
  if(new Set(snapshots.map(s=>s.id)).size!==snapshots.length)throw new Error('รหัสภายในสรุปซ้ำ');
  for(const t of transactions){const e=validateTransaction(t);if(e.length)throw new Error(e.join('; '));}
  const ids=transactions.map(t=>t.id);if(new Set(ids).size!==ids.length)throw new Error('รหัสภายในรายการซ้ำ');
  const imports=merge(base.imports,next.imports,t=>t.id);
  return {data:ledgerSchema.parse({schemaVersion:1,transactions,snapshots,imports}),duplicates,added:transactions.length-base.transactions.length};
}
export function readBackup(text){
  if(new TextEncoder().encode(text).length>2_000_000)throw new Error('JSON ต้องไม่เกิน 2 MB');
  return ledgerSchema.parse(JSON.parse(text));
}
export function friendlyError(e){return e?.issues?'ข้อมูลไม่ถูกต้อง: '+e.issues.map(i=>i.path.join('.')+' '+i.message).join(' / '):e?.message||'เกิดข้อผิดพลาด';}
