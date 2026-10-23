import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const base=path.resolve('dist'),port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.svg':'image/svg+xml','.mp4':'video/mp4','.zip':'application/zip'};
http.createServer((req,res)=>{try{let target=path.resolve(base,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(target!==base&&!target.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}if(fs.statSync(target).isDirectory())target=path.join(target,'index.html');res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');fs.createReadStream(target).pipe(res);}catch{res.writeHead(404);res.end('Not found');}}).listen(port,()=>console.log(`Studio starter: http://localhost:${port}`));
