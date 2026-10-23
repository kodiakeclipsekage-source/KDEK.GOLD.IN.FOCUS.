import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {createApiRouter} from './api.js';
const app = express();
app.disable('x-powered-by');
// Vite serves source files in development; explicitly exclude private documents.
app.use((req,res,next)=>{
 let pathname;try{pathname=decodeURIComponent(req.path).replace(/\\/g,'/');}catch{return res.status(400).end();}
 if(/(^|\/)pdf(\/|$)/i.test(pathname)||/\.(pdf|env)$/i.test(pathname))return res.status(403).end('Private files are not served.');
 next();
});
const verifyToken=async token=>{
  const {getApps,initializeApp,applicationDefault}=await import('firebase-admin/app');
  const {getAuth}=await import('firebase-admin/auth');
  if(!getApps().length)initializeApp({credential:applicationDefault(),projectId:process.env.FIREBASE_PROJECT_ID||process.env.VITE_FIREBASE_PROJECT_ID});
  return getAuth().verifyIdToken(token,true);
};
app.use('/api',createApiRouter(process.env,{verifyToken}));
app.use('/api',(_req,res)=>res.status(404).json({error:'ไม่พบ API'}));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv.includes('--production')) {
  app.use(express.static(path.join(root,'dist')));
  app.get('/{*path}', (_req,res)=>res.sendFile(path.join(root,'dist/index.html')));
} else {
  const {createServer} = await import('vite');
  const vite = await createServer({root,server:{middlewareMode:true,fs:{deny:['**/.env','**/.env.*','**/.git/**','**/pdf/**','**/*adminsdk*.json','**/service-account*.json']}},appType:'spa'});
  app.use(vite.middlewares);
}
app.listen(Number(process.env.PORT || 5173), process.env.HOST || '127.0.0.1',()=>console.log('KODIAK: http://127.0.0.1:'+(process.env.PORT||5173)));
