import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=workerUrl;
export async function readPdf(file,password=''){
 if(!file||file.size>20*1024*1024)throw new Error('เลือก PDF ขนาดไม่เกิน 20 MB');
 const data=new Uint8Array(await file.arrayBuffer());
 if(new TextDecoder().decode(data.slice(0,5))!=='%PDF-')throw new Error('ไฟล์นี้ไม่ใช่ PDF');
 const task=getDocument({data,password,isEvalSupported:false,verbosity:0});
 try{
  const pdf=await task.promise;
  if(pdf.numPages>100)throw new Error('รองรับไม่เกิน 100 หน้า');
  const pages=[];
  for(let n=1;n<=pdf.numPages;n++){
   const page=await pdf.getPage(n),content=await page.getTextContent();
   const rows=[];
   for(const item of content.items){
    if(!('str' in item)||!item.str.trim())continue;
    const y=item.transform[5];let row=rows.find(r=>Math.abs(r.y-y)<2);
    if(!row){row={y,items:[]};rows.push(row);}row.items.push({x:item.transform[4],str:item.str});
   }
   pages.push(rows.sort((a,b)=>b.y-a.y).map(r=>r.items.sort((a,b)=>a.x-b.x).map(i=>i.str).join(' ')).join('\n'));
  }
  const text=pages.join('\n');
  if(!text.trim())throw new Error('PDF ไม่มีข้อความที่อ่านได้ อาจเป็นภาพสแกน รุ่นนี้ยังไม่รองรับ OCR');
  return text;
 }catch(e){
  if(e.name==='PasswordException')throw new Error(e.code===2?'รหัสผ่าน PDF ไม่ถูกต้อง กรุณาลองใหม่':'PDF นี้ต้องใช้รหัสผ่าน');
  if(e.name==='InvalidPDFException')throw new Error('PDF เสียหายหรือรูปแบบไม่ถูกต้อง');
  throw e;
 }finally{await task.destroy();}
}
