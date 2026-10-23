import {initializeApp} from 'firebase/app';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut} from 'firebase/auth';
import {getFirestore,doc,getDoc,runTransaction} from 'firebase/firestore';
import {emptyLedger,ledgerSchema,mergeLedger} from '../shared/schema.js';
const cfg={apiKey:import.meta.env.VITE_FIREBASE_API_KEY,authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,appId:import.meta.env.VITE_FIREBASE_APP_ID};
export const firebaseConfigured=Object.values(cfg).every(Boolean);
export const auth=firebaseConfigured?getAuth(initializeApp(cfg)):null;
const db=auth?getFirestore(auth.app):null;
export const watchAuth=fn=>auth?onAuthStateChanged(auth,fn):(()=>{fn(null);return ()=>{};})();
export const login=(email,password,register)=>register?createUserWithEmailAndPassword(auth,email,password):signInWithEmailAndPassword(auth,email,password);
export const logout=()=>signOut(auth);
const localKey='kodiak:ledger:v1:device';
const documentRef=uid=>doc(db,'users',uid,'state','ledger');
export async function loadLedger(user){
 if(user){const snap=await getDoc(documentRef(user.uid));return snap.exists()?ledgerSchema.parse(snap.data()):emptyLedger();}
 const raw=localStorage.getItem(localKey);return raw?ledgerSchema.parse(JSON.parse(raw)):emptyLedger();
}
// Mutator re-runs on the latest remote version to avoid losing concurrent edits.
export async function updateLedger(user,mutator){
 const checked=data=>{
   const clean=ledgerSchema.parse(data);
   if(new TextEncoder().encode(JSON.stringify(clean)).length>800_000)throw new Error('ข้อมูลเกิน 800 KB กรุณาส่งออกสำรอง (ขีดจำกัดรุ่นสมุดส่วนบุคคล)');
   return clean;
 };
 if(user)return runTransaction(db,async tr=>{const ref=documentRef(user.uid),snap=await tr.get(ref);const data=checked(mutator(snap.exists()?ledgerSchema.parse(snap.data()):emptyLedger()));tr.set(ref,data);return data;});
 const write=async()=>{const data=checked(mutator(await loadLedger(null)));localStorage.setItem(localKey,JSON.stringify(data));return data;};
 return navigator.locks?navigator.locks.request('kodiak-ledger-device',write):write();
}
export const mergeData=(user,incoming)=>updateLedger(user,current=>mergeLedger(current,incoming).data);
