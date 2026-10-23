import test from 'node:test';
import fs from 'node:fs';
import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {doc,getDoc,setDoc,runTransaction} from 'firebase/firestore';
import {emptyLedger,mergeLedger} from '../shared/schema.js';
import assert from 'node:assert/strict';
test('Firestore emulator: owner isolation, no unauthenticated access, atomic idempotent imports',{skip:!process.env.FIRESTORE_EMULATOR_HOST},async()=>{
 const [host,port]=process.env.FIRESTORE_EMULATOR_HOST.split(':');
 const env=await initializeTestEnvironment({projectId:'demo-kodiak',firestore:{host,port:+port,rules:fs.readFileSync('firestore.rules','utf8')}});
 try{
  const alice=env.authenticatedContext('alice').firestore(),bob=env.authenticatedContext('bob').firestore(),guest=env.unauthenticatedContext().firestore();
  const ref=doc(alice,'users/alice/state/ledger');await assertSucceeds(setDoc(ref,emptyLedger()));
  await assertSucceeds(getDoc(ref));await assertFails(getDoc(doc(bob,'users/alice/state/ledger')));await assertFails(setDoc(doc(bob,'users/alice/state/ledger'),emptyLedger()));await assertFails(getDoc(doc(guest,'users/alice/state/ledger')));await assertFails(setDoc(ref,{...emptyLedger(),password:'not-allowed'}));
  const incoming={...emptyLedger(),transactions:[{id:'test1',date:'2026-10-17T10:00',type:'buy',provider:'SYNTHETIC',reference:'TEST-1',goldType:'96.5%',unit:'baht',currency:'THB',weight:'1',unitPrice:'100',amount:'100',fee:'0'}]};
  const apply=()=>runTransaction(alice,async tr=>{const snap=await tr.get(ref);tr.set(ref,mergeLedger(snap.data(),incoming).data);});
  await apply();await apply();assert.equal((await getDoc(ref)).data().transactions.length,1);
  const bad=structuredClone(incoming);bad.transactions[0].fee='1';await assert.rejects(runTransaction(alice,async tr=>{const snap=await tr.get(ref);tr.set(ref,mergeLedger(snap.data(),bad).data);}));assert.equal((await getDoc(ref)).data().transactions[0].fee,'0');
 }finally{await env.cleanup();}
});
