import express from 'express';
import {rateLimit} from 'express-rate-limit';
import {z} from 'zod';
import {callProvider} from './providers.js';
const requestSchema=z.object({provider:z.enum(['local','openai','gemini','claude']),model:z.string().trim().min(1).max(150).regex(/^[a-zA-Z0-9._:/-]+$/),endpoint:z.string().max(200).optional(),table:z.string().max(40000),test:z.boolean().optional()}).strict();
const testTable='1\t2026-01-01T10:00\tbuy\tROW_1\t1\t100\t100\t0\tg\tTHB';
export function createApiRouter(env=process.env,{verifyToken,fetchFn=fetch}={}){
 const router=express.Router();
 router.use((_req,res,next)=>{res.set('Cache-Control','no-store');next();});
 router.get('/health',(_req,res)=>res.json({ok:true}));
 router.get('/config',(_req,res)=>res.json({local:env.ALLOW_LOCAL_AI!=='false'&&(env.HOST||'127.0.0.1')==='127.0.0.1',openai:!!env.OPENAI_API_KEY,gemini:!!env.GEMINI_API_KEY,claude:!!env.ANTHROPIC_API_KEY}));
 router.use(rateLimit({windowMs:60_000,limit:20,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'เรียก AI บ่อยเกินไป กรุณารอ 1 นาที'}}));
 router.use(express.json({limit:'48kb'}));
 router.post('/ai',async(req,res)=>{
  const parsed=requestSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:'คำขอไม่ถูกต้อง ต้องระบุ provider โมเดล และตารางเท่านั้น'});
  const input=parsed.data;
  const local=input.provider==='local';
  if(local){
   const hostname=req.hostname;
   const allowed=env.ALLOW_LOCAL_AI!=='false'&&(env.HOST||'127.0.0.1')==='127.0.0.1'&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)&&['127.0.0.1','localhost'].includes(hostname);
   const origin=req.get('origin');
   if(!allowed||(origin&&origin!==`${req.protocol}://${req.get('host')}`))return res.status(403).json({error:'Local AI ใช้ได้จากเว็บที่รันบนคอมเครื่องนี้เท่านั้น'});
  }else{
   const token=req.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
   if(!token)return res.status(401).json({error:'กรุณาเข้าสู่ระบบ Firebase ก่อนใช้ Online AI'});
   try{if(!verifyToken)throw new Error();await verifyToken(token);}catch{return res.status(401).json({error:'ยืนยันสิทธิ์ Firebase ไม่ผ่าน กรุณาเข้าสู่ระบบใหม่และตรวจ config ฝั่ง server'});}
  }
  try{
   const result=await callProvider({...input,table:input.test?testTable:input.table},env,fetchFn);
   res.json({result,provider:input.provider,model:input.model,test:!!input.test});
  }catch(e){res.status(422).json({error:e.message});}
 });
 router.use((err,_req,res,_next)=>res.status(err.status===413?413:400).json({error:err.status===413?'คำขอใหญ่เกินไป':'รูปแบบคำขอไม่ถูกต้อง'}));
 return router;
}
