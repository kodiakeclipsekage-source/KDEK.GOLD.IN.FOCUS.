import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMts} from '../shared/mts.js';
import {emptyLedger,mergeLedger} from '../shared/schema.js';
import {calculate} from '../shared/calculations.js';
import {mtsRows} from './fixtures/mts-rows.js';

test('printed MTS row layout reads one BUY and a separate opening checkpoint',()=>{
 const result=parseMts(mtsRows);
 assert.deepEqual(result.warnings,[]);assert.equal(result.transactions.length,1);assert.equal(result.snapshots.length,1);
 const t=result.transactions[0],s=result.snapshots[0];
 assert.equal(t.reference,'GPB2610170000001');assert.equal(t.date,'2026-10-17T00:37:00');assert.equal(t.goldType,'GLDOZUSD');
 assert.equal(t.weight,'0.00240');assert.equal(t.unitPrice,'4162.66');assert.equal(t.amount,'10.00');assert.equal(t.unit,'oz');assert.equal(t.currency,'USD');
 assert.equal(s.opening,'0.00241');assert.equal(s.openingAverage,'4149.38');assert.equal(s.closing,'0.00481');assert.equal(s.average,'4158.00');
 const incoming={...emptyLedger(),transactions:result.transactions,snapshots:result.snapshots};
 const merged=mergeLedger(emptyLedger(),incoming).data;
 assert.equal(mergeLedger(merged,incoming).duplicates,2);assert.equal(calculate(merged)[0].quantity,'0.00481');
});

test('row layout accepts PDF spacing and Thai Buddhist-era trade dates',()=>{
 for(const source of [mtsRows.replaceAll(' ','\u00a0   ').replaceAll('\n','\r\n'),mtsRows.replaceAll('17/10/2026','17/10/2569')]){
  const parsed=parseMts(source);assert.deepEqual(parsed.warnings,[]);assert.equal(parsed.transactions[0].date,'2026-10-17T00:37:00');
 }
});

test('ambiguous rows, reversed columns, inconsistent totals and mismatched checkpoints stay for review',()=>{
 const trade='GLDOZUSD 17/10/2026 00:37:00 GPB2610170000001 0.00240 4,162.66 10.00';
 for(const source of [
  mtsRows.replace('GPB2610170000001 BUY','GPB2610170000002 BUY'),
  mtsRows.replace('GPB2610170000001 BUY','GPB2610170000001 SELL'),
  mtsRows.replace(trade,trade+'\n'+trade),
  mtsRows.replace(trade,trade+'\nGLDOZUSD unknown trade row'),
  mtsRows+'\nGLDOZUSD 17/10/2026 01:00:00 UNKNOWN BUY 0.00100 4,162.66 0.00581 4,158.00',
  mtsRows.replace('น้ำหนักซื้อ น้ำหนักขาย','น้ำหนักขาย น้ำหนักซื้อ'),
  mtsRows.replace('0.00240 0.00000 10.00 0.00','0.00240 0.00000 11.00 0.00'),
  mtsRows.replace('0.00240 0.00000 10.00 0.00','0.00240 0.00100 10.00 4.00'),
  mtsRows.replace(/0.00240 0.00000$/,'0.00240 0.00100'),
  mtsRows.replace('BUY 0.00240 4,162.66','BUY 0.00240 4,200.00'),
  mtsRows.replace('GLDOZUSD B/F 0.00241 4,149.38',''),
  mtsRows.replace('0.00240 0.00000 10.00 0.00',''),
  mtsRows.replace('GLDOZUSD B/F','GLDOTHER B/F'),
 ]){
  const parsed=parseMts(source);assert.equal(parsed.transactions.length,0);assert.equal(parsed.snapshots.length,0);assert.ok(parsed.warnings.length);
 }
});

test('reported balance differences remain visible without inventing replacement values',()=>{
 const parsed=parseMts(mtsRows.replace('0.00481 4,158.00','0.00500 4,158.00'));
 assert.equal(parsed.transactions.length,1);assert.equal(parsed.snapshots[0].closing,'0.00500');
 assert.ok(parsed.warnings.some(w=>w.includes('ยอดยกมา')));assert.ok(parsed.warnings.some(w=>w.includes('จำนวนหน่วย')));
});
