import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyLedger,mergeLedger,readBackup,validateTransaction} from '../shared/schema.js';
import {calculate} from '../shared/calculations.js';
const tx=(over={})=>({id:'1',date:'2026-10-17T10:00',type:'buy',provider:'MTS',reference:'R1',goldType:'96.5%',weight:'2',unit:'baht',unitPrice:'40000',amount:'80000',currency:'THB',fee:'0',...over});
test('weighted average buy/sell with fees and exact decimals',()=>{
 const l={...emptyLedger(),transactions:[tx(),tx({id:'2',reference:'R2',date:'2026-10-18T10:00',type:'sell',weight:'1',unitPrice:'42000',amount:'42000',fee:'10'})]};
 const r=calculate(l,true)[0];assert.equal(r.quantity,'1');assert.equal(r.cost,'40000.00');assert.equal(r.realized,'1990.00');assert.equal(r.unrealized,null);
});
test('incomplete history never claims a zero profit',()=>assert.equal(calculate({...emptyLedger(),transactions:[tx()]})[0].realized,null));
test('opening is not a buy and daily closing balances do not accumulate',()=>{
 const snap={id:'s',date:'2026-10-17',provider:'MTS',goldType:'96.5%',unit:'baht',currency:'THB',opening:'5',closing:'5',average:'40000',openingAverage:null};
 const r=calculate({...emptyLedger(),snapshots:[snap,{...snap,id:'s2',date:'2026-10-18'}]})[0];assert.equal(r.quantity,'5');assert.equal(r.buyCount,0);assert.equal(r.cost,null);assert.equal(r.realized,null);
});
test('known opening cost supports realized profit',()=>{
 const l={...emptyLedger(),transactions:[tx({type:'sell',weight:'1',amount:'40000'})],snapshots:[{id:'s',date:'2026-10-17',provider:'MTS',goldType:'96.5%',unit:'baht',currency:'THB',opening:'5',closing:'4',average:'39000',openingAverage:'39000'}]};
 assert.equal(calculate(l)[0].realized,'1000.00');
});
test('overselling and gaps invalidate profit',()=>{const r=calculate({...emptyLedger(),transactions:[tx({type:'sell'})]},true)[0];assert.equal(r.realized,null);assert.ok(r.warnings.length);});
test('same-time mixed buy/sell does not invent transaction order or known profit',()=>{const l={...emptyLedger(),transactions:[tx(),tx({id:'2',reference:'R2',type:'sell',weight:'1',amount:'40000'})]};const r=calculate(l,true)[0];assert.equal(r.realized,null);assert.ok(r.warnings.some(w=>w.includes('เวลาเดียวกัน')));});
test('different units, currencies, purity and providers stay separate',()=>{const l={...emptyLedger(),transactions:[tx(),tx({unit:'g'}),tx({currency:'USD'}),tx({goldType:'99.99%'}),tx({provider:'other'})]};assert.equal(calculate(l,true).length,5);});
test('rounding tolerance and decimal strings',()=>{
 assert.deepEqual(validateTransaction(tx({weight:'0.33333333',unitPrice:'100',amount:'33.33'})),[]);
 assert.ok(validateTransaction(tx({amount:'79999'})).length);
 assert.ok(validateTransaction(tx({weight:'NaN'})).length);
});
test('dedup is idempotent, decimals normalized and conflicts atomic',()=>{
 const a={...emptyLedger(),transactions:[tx()]};assert.equal(mergeLedger(a,a).data.transactions.length,1);
 assert.equal(mergeLedger(a,{...a,transactions:[tx({id:'new',weight:'2.00'})]}).duplicates,1);
 assert.throws(()=>mergeLedger(a,{...a,transactions:[tx({amount:'10'})]}),/ขัดแย้ง/);assert.equal(a.transactions[0].amount,'80000');
});
test('JSON schema rejects credentials, invalid dates and version',()=>{
 assert.throws(()=>readBackup(JSON.stringify({...emptyLedger(),password:'secret'})));
 assert.throws(()=>readBackup(JSON.stringify({...emptyLedger(),schemaVersion:2})));
 assert.ok(validateTransaction(tx({date:'2026-02-30T10:00'})).length);
});
