import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMts} from '../shared/mts.js';
import {emptyLedger,mergeLedger,validateTransaction} from '../shared/schema.js';
import {calculate} from '../shared/calculations.js';
import {validatePurchase,purchaseRecords,documentNumber,upsertPurchase,removePurchase} from '../shared/purchase-import.js';
const value={date:'2026-10-17T00:37',goldType:'GLDOZUSD',weight:'0.00240',unitPrice:'4162.66',amount:'10.00',closing:'0.00481',average:'4158.0'};
const source=`| ข้อมูล | ค่าจากเอกสาร |
| --- | --- |
| วันที่ซื้อ | 17/10/2026 เวลา 00:37 |
| ประเภททอง | GLDOZUSD |
| น้ำหนักซื้อ | 0.00240 OZ |
| ราคาต่อหน่วย | 4,162.66 |
| จำนวนเงินซื้อ | 10.00 |
| ทองคงเหลือสิ้นวัน | 0.00481 OZ |
| ราคาเฉลี่ยคงเหลือ | 4,158.0 |`;
test('requested seven fields parse exactly, no opening balance or reference required',()=>{
 const parsed=parseMts(source),t=parsed.transactions[0],s=parsed.snapshots[0];
 assert.equal(parsed.supported,true);assert.deepEqual(parsed.warnings,[]);
 for(const key of ['date','goldType','weight','unitPrice','amount'])assert.equal(t[key],value[key]);
 assert.equal(t.unit,'oz');assert.equal(t.currency,'USD');assert.equal(s.closing,value.closing);assert.equal(s.average,value.average);assert.equal(s.opening,null);assert.equal(s.openingAverage,null);
 assert.deepEqual(validateTransaction(t),[]);assert.deepEqual(validatePurchase(value),[]);
 const merged=mergeLedger(emptyLedger(),{...emptyLedger(),transactions:parsed.transactions,snapshots:parsed.snapshots}).data;
 const holding=calculate(merged)[0];assert.equal(holding.quantity,'0.00481');assert.equal(holding.realized,null);assert.equal(holding.cost,null);
});
test('seven-field review retains printed precision and reported amount',()=>{
 assert.equal(documentNumber(value.weight),'0.00240');assert.equal(documentNumber(value.closing),'0.00481');assert.equal(documentNumber(value.unitPrice),'4,162.66');assert.equal(documentNumber(value.amount),'10.00');assert.equal(documentNumber(value.average),'4,158.0');
});
test('explicit GLDOZUSD BUY table rows do not require seven human-written labels',()=>{
 for(const trade of ['17/10/2026 00:37 GLDOZUSD BUY 0.00240 OZ 4,162.66 10.00','17/10/2026 00:37 ซื้อ GLDOZUSD 0.00240 4,162.66 10.00']){
 const parsed=parseMts('MTS Daily Statement\n'+trade+'\nClosing Balance: 0.00481 OZ\nAverage Price: 4,158.0');
 assert.equal(parsed.transactions.length,1);assert.equal(parsed.transactions[0].weight,'0.00240');assert.equal(parsed.transactions[0].amount,'10.00');assert.equal(parsed.snapshots[0].closing,'0.00481');assert.equal(parsed.snapshots[0].average,'4158.0');assert.deepEqual(parsed.warnings,[]);
 }
});
test('unparsed sell rows stay visible as warnings and missing closing figures are never invented',()=>{
 const parsed=parseMts('GLDOZUSD\n17/10/2026 00:37 GLDOZUSD BUY 0.00240 OZ 4162.66 10.00\n17/10/2026 01:00 GLDOZUSD SELL 0.00100 OZ 4162.66 4.16');
 assert.equal(parsed.transactions.length,1);assert.equal(parsed.snapshots[0].closing,'');assert.ok(parsed.warnings.some(w=>w.includes('แยกไม่ได้')));
});
test('same seven-field document imported twice is idempotent without a user-entered reference',()=>{
 const a=parseMts(source),b=parseMts(source);const current=mergeLedger(emptyLedger(),{...emptyLedger(),transactions:a.transactions,snapshots:a.snapshots}).data;
 const next=mergeLedger(current,{...emptyLedger(),transactions:b.transactions,snapshots:b.snapshots});assert.equal(next.data.transactions.length,1);assert.equal(next.data.snapshots.length,1);assert.equal(next.duplicates,2);
 const {transaction}=purchaseRecords({...value,weight:'0.0024',unitPrice:'4162.660',amount:'10.0'});assert.equal(transaction.reference,a.transactions[0].reference);
});
test('minimal editor validates missing values; summaries stay separate and shared correctly',()=>{
 assert.ok(validatePurchase({...value,closing:''}).length);assert.ok(validatePurchase({...value,average:''}).length);
 const first=upsertPurchase(emptyLedger(),value);const second=upsertPurchase(first,{...value,date:'2026-10-17T01:00'});assert.equal(second.snapshots.length,1);
 const edited=upsertPurchase(second,{...value,date:'2026-10-18T00:37'},second.transactions[0],second.snapshots[0]);assert.equal(edited.snapshots.length,2);
 const removed=removePurchase(second,second.transactions[0],second.snapshots[0]);assert.equal(removed.snapshots.length,1);assert.equal(removed.transactions.length,1);
});
