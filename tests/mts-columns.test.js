import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMts} from '../shared/mts.js';
import {emptyLedger,mergeLedger} from '../shared/schema.js';
import {calculate} from '../shared/calculations.js';
import {mtsColumns} from './fixtures/mts-columns.js';
test('MTS column reading order produces one BUY, not repeated trades or a B/F purchase',()=>{
 const result=parseMts(mtsColumns);assert.deepEqual(result.warnings,[]);assert.equal(result.transactions.length,1);assert.equal(result.snapshots.length,1);
 const t=result.transactions[0],s=result.snapshots[0];
 assert.equal(t.date,'2026-10-17T00:37:00');assert.equal(t.reference,'GPB2610170000001');assert.equal(t.goldType,'GLDOZUSD');assert.equal(t.weight,'0.00240');assert.equal(t.unitPrice,'4162.66');assert.equal(t.amount,'10.00');
 assert.equal(s.opening,'0.00241');assert.equal(s.closing,'0.00481');assert.equal(s.openingAverage,'4149.38');assert.equal(s.average,'4158.00');
 const incoming={...emptyLedger(),transactions:result.transactions,snapshots:result.snapshots};const first=mergeLedger(emptyLedger(),incoming).data;assert.equal(mergeLedger(first,incoming).data.transactions.length,1);assert.equal(calculate(first)[0].quantity,'0.00481');
});
test('PDF line breaks, repeated spaces and totals keep the same values',()=>{
 const parsed=parseMts(mtsColumns.replaceAll(' ','\n  '));assert.equal(parsed.transactions[0].amount,'10.00');assert.equal(parsed.snapshots[0].closing,'0.00481');assert.deepEqual(parsed.warnings,[]);
});
test('conflicting references, nonzero outgoing, multiple trades or columns do not get guessed',()=>{
 for(const text of [mtsColumns.replace('GPB2610170000001 BUY','GPB2610170000002 BUY'),mtsColumns.replace('รายการขาออก น้ำหนัก 0.00000','รายการขาออก น้ำหนัก 0.00100'),mtsColumns+' GPB2610170000002',mtsColumns.replace('0.00240 0.00240 น้ำหนักขาย','0.00240 0.00500 น้ำหนักขาย'),mtsColumns.replace(' BUY ',' SELL ')]){
  const parsed=parseMts(text);assert.equal(parsed.transactions.length,0);assert.ok(parsed.warnings.length);
 }
});
