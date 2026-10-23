import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {createApiRouter} from '../server/api.js';
import {callProvider,parseAiResult,localBase} from '../server/providers.js';
import {parseMts,safeAiTable,validateSafeTable} from '../shared/mts.js';
const table='1\t2026-10-17T10:00\tbuy\tROW_1\t2\t40000\t80000\t0\tbaht\tTHB';
const result={rows:[{row:1,date:'2026-10-17T10:00',type:'buy',weight:'2',unitPrice:'40000',amount:'80000',fee:'0',unit:'baht',currency:'THB'}],summary:'ข้อมูลจำลองสำหรับทดสอบ'};
test('MTS explicit-column fixture parses and opening remains a snapshot',()=>{
 const r=parseMts('MTS Daily Statement\nStatement Date: 17/10/2026\nGold 96.5% Unit baht Currency THB\n17/10/2026 10:00 BUY R1 2 40,000.00 80,000.00\nOpening Balance: 5\nClosing Balance: 7\nAverage Price: 40000');
 assert.equal(r.transactions.length,1);assert.equal(r.snapshots[0].opening,'5');assert.equal(r.snapshots[0].openingAverage,null);assert.equal(safeAiTable(r.transactions),table.replace('40000\t80000','40000.00\t80000.00'));
});
test('MTS missing currency or units are not inferred and unknown layouts not silently accepted',()=>{
 const r=parseMts('MTS Daily Statement\n17/10/2026 10:00 BUY R1 2 40,000 80,000');assert.equal(r.transactions[0].currency,'');assert.equal(r.transactions[0].unit,'');assert.ok(r.warnings.length);
 assert.equal(parseMts('Other Statement\n17/10/2026 10:00 BUY R1 2 40000 80000').transactions.length,0);
});
test('ambiguous currencies, units and purities stay blank for human review',()=>{
 const r=parseMts('MTS Daily Statement THB USD baht gram 96.5% 99.99%\n17/10/2026 10:00 BUY R1 2 40000 80000');const t=r.transactions[0];assert.equal(t.currency,'');assert.equal(t.unit,'');assert.equal(t.goldType,'');assert.ok(r.warnings.some(w=>w.includes('หลายสกุลเงิน')));
});
test('safe table excludes free text, reference and provider',()=>{assert.throws(()=>validateSafeTable(table+'\nCustomer John Account 123'));assert.equal(validateSafeTable(table),table);});
test('AI schema rejects malformed JSON, unknown fields and lost or extra rows',()=>{assert.throws(()=>parseAiResult('nonsense',table));assert.throws(()=>parseAiResult({...result,apiKey:'secret'},table));assert.throws(()=>parseAiResult({...result,rows:[]},table));assert.throws(()=>parseAiResult({...result,rows:[result.rows[0],result.rows[0]]},table));});
test('LM endpoint loopback and no redirect/credentials/remote hosts',()=>{
 assert.equal(localBase('http://localhost:1234/v1'),'http://127.0.0.1:1234/v1');for(const u of ['http://evil.com/v1','http://127.0.0.1.evil.com/v1','http://user:pass@127.0.0.1/v1','http://127.0.0.1/v1?x=a'])assert.throws(()=>localBase(u));
});
for(const provider of ['local','openai','gemini','claude'])test(provider+' adapter contract with synthetic mock (not live)',async()=>{
 let calls=0;const fake=async(url,options)=>{calls++;const body=JSON.parse(options.body);assert.equal(options.redirect,'error');if(provider==='gemini')assert.ok(url.includes('test-model:generateContent'));else assert.equal(body.model,'test-model');
  const response=provider==='local'?{choices:[{message:{content:JSON.stringify(result)}}]}:provider==='openai'?{output:[{content:[{type:'output_text',text:JSON.stringify(result)}]}]}:provider==='gemini'?{candidates:[{content:{parts:[{text:JSON.stringify(result)}]}}]}:{content:[{type:'tool_use',name:'gold_ledger',input:result}]};return new Response(JSON.stringify(response));};
 assert.deepEqual(await callProvider({provider,model:'test-model',table},{OPENAI_API_KEY:'test',GEMINI_API_KEY:'test',ANTHROPIC_API_KEY:'test'},fake),result);assert.equal(calls,1);
});
test('network, timeout, HTTP 429, malformed responses and missing key fail without fallback',async()=>{
 const input={provider:'local',model:'test',table};await assert.rejects(callProvider(input,{},async()=>{throw new Error('offline');}),/เชื่อมต่อ/);
 await assert.rejects(callProvider(input,{},async()=>{throw new DOMException('timeout','TimeoutError');}),/เวลาเกิน/);
 await assert.rejects(callProvider(input,{},async()=>new Response('{}',{status:429})),/จำกัด/);
 await assert.rejects(callProvider(input,{},async()=>new Response('bad')),/JSON/);
 let called=false;await assert.rejects(callProvider({...input,provider:'openai'},{},async()=>{called=true;}),/ยังไม่ตั้งค่า/);assert.equal(called,false);
});
test('API requires Firebase identity online; rejects foreign Origin, body secrets and oversize',async()=>{
 const app=express();app.use('/api',createApiRouter({},{verifyToken:async()=>{throw new Error('invalid');}}));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url='http://127.0.0.1:'+server.address().port+'/api/ai';
 const send=(body,headers={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
 const input={provider:'openai',model:'test',table};try{
 assert.equal((await send(input)).status,401);assert.equal((await send(input,{Authorization:'Bearer invalid'})).status,401);
 assert.equal((await send({...input,provider:'local'},{Origin:'https://foreign.example'})).status,403);
 assert.equal((await send({...input,password:'secret'})).status,400);assert.equal((await send({...input,table:'x'.repeat(60000)})).status,413);
 let last;for(let i=0;i<16;i++)last=await send(input);assert.equal(last.status,429);
 }finally{await new Promise(r=>server.close(r));}
});
