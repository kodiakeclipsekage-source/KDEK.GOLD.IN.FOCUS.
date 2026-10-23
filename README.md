# KODIAK Gold Ledger

เว็บภาษาไทยสำหรับบันทึกทองคำส่วนบุคคล สร้างแยกในโฟลเดอร์นี้

ส่วนหน้าจอใช้ HTML, CSS และ JavaScript แบบ ES modules ไม่มี React / JSX ใช้ Vite สำหรับรวมโมดูลและ dependencies ของ PDF.js, Firebase และการตรวจข้อมูล เปิดผ่าน `npm run dev` หรือ build แล้วใช้ `npm start`

UI ใช้ฟอนต์และโครงร่างจากชุด `studio-design-system` ของ KDEK โดยปรับสีแอปเป็นขาว `#FFFFFF` เทา `#F3F3F0` ทอง `#C4A35A` ดำ `#171816` และแดง `#E91632` ใช้แดงเป็นสีเน้นและแสดงการลบหรือข้อผิดพลาด โดยใช้แดงเข้ม `#AA1730` สำหรับข้อความ กำหนด palette และสีขององค์ประกอบใน `src/theme.css` ใช้ THE BOLD FONT สำหรับ display อังกฤษ และ Kanit สำหรับภาษาไทย ฟอนต์และโลโก้โหลดจากเครื่อง ไม่เรียก Google Fonts ตัว `predev`/`prebuild` รัน `scripts/prepare-design.mjs` เพื่อสร้าง CSS จาก tokens ต้นฉบับและคัดลอก assets พร้อม license ลง `public/` แล้ว Vite รวมเข้า `dist/` แก้ tokens ร่วมที่ `studio-design-system/design-system/tokens/` และปรับสีเฉพาะแอปใน `src/theme.css` โดยไม่ต้องแก้ไฟล์ CSS ที่ generate

## เริ่มต้น
ต้องใช้ Node.js 22.13+ (ทดสอบบน Node 24.12)
```powershell
npm install
Copy-Item .env.example .env
npm run dev
```
เปิด http://127.0.0.1:5173 จากนั้น **นำเข้าเอกสาร → เลือกโฟลเดอร์** แล้วเลือก `pdf/` และกรอกรหัสผ่านบนหน้าเว็บ

การนำเข้า GLDOZUSD ใช้เพียง 7 ช่อง: วันที่ซื้อ, ประเภททอง, น้ำหนักซื้อ (OZ), ราคาต่อหน่วย, จำนวนเงินซื้อ, ทองคงเหลือสิ้นวัน (OZ), ราคาเฉลี่ยคงเหลือ (USD) แสดงทศนิยมตามเอกสารครบ ไม่บังคับเลขอ้างอิงหรือยอดยกมา ระบบสร้างรหัสกันซ้ำภายในเมื่อไม่มีเลขอ้างอิง และเก็บยอดยกมาที่ไม่ทราบเป็น null แยกรายการซื้อออกจากสรุปสิ้นวัน รองรับข้อความที่มีชื่อช่องและ MTS PDF ทั้งข้อความเรียงเป็นคอลัมน์หรือเป็นแถว โดยรูปแบบตาราง MTS นี้รองรับรายการซื้อเดียวพร้อมยอด B/F; layout อื่นยังต้องตรวจและแก้ 7 ช่องในหน้าตรวจก่อนยืนยัน

รองรับเพิ่ม/แก้ไข/ลบรายการ ค้นหาและกรองวันที่ ภาพรวมแยกชนิดทอง/หน่วย/สกุลเงิน สรุปตามเอกสาร สำรอง JSON และตรวจข้อมูลก่อนนำเข้า ไม่มีข้อมูลตัวอย่างปะปนกับข้อมูลจริงในเว็บ

- [คู่มือตั้งค่า Firebase, AI และ deploy](docs/SETUP.md)
- [ผลทดสอบและส่วนที่ยังรอการตั้งค่า](TEST_REPORT.md)
- [สถานะงานทั้ง 8 ขั้น](TASKS.md)

ทดสอบเปิด PDF เข้ารหัสจริงของวันที่ 17 ตุลาคม 2026 ด้วยรหัสที่ผู้ใช้ให้แล้ว อ่านตารางครบ 7 ช่องผ่าน PDF.js และหน้าตรวจก่อนบันทึก ทดสอบนำเข้าซ้ำในเบราว์เซอร์ทดสอบได้ 1 ธุรกรรมกับ 1 สรุป โดยไม่มีคำขอ POST ออกไป ไม่เก็บรหัสผ่านไว้ในซอร์สหรือ fixtures หากแยกไม่ได้ให้ตรวจข้อความและเพิ่มแถวด้วยมือ ไม่เดาค่าหรือบันทึกอัตโนมัติ

## โครงสร้าง
- `index.html`: หน้าเริ่มต้นและลิงก์ CSS / JavaScript
- `src/`: หน้าจอ JavaScript แบบ ES modules ใช้ native DOM โดยไม่ใช้ React หรือ JSX, อ่านและปลดล็อก PDF ภายในเบราว์เซอร์, Firebase client
- `src/main.js`: เริ่มแอปและติดตามสถานะบัญชี; `src/App.js`, `src/Importer.js`, `src/PurchaseImport.js`, `src/ai.js`, `src/ui.js`: หน้าจอและฟอร์ม; `src/dom.js`: สร้างและปรับปรุง DOM, ผูก events และจัดการ focus ของ dialog
- `src/style.css`, `src/theme.css`: รูปแบบหน้าจอและสี โดยคงชุดออกแบบเดิม
- `shared/`: schema, ตรวจข้อมูล, คำนวณ Decimal, merge ป้องกันซ้ำ, parser MTS
- `server/`: Express backend และ local bridge เรียก AI; key อยู่ฝั่ง server
- `tests/`: การทดสอบข้อมูล การคำนวณ API และหน้าจอ
- `pdf/`: เอกสารส่วนตัว ไม่เผยแพร่ผ่านเว็บ ไม่เข้า Git

## เส้นทาง AI
Local: เปิดเว็บจาก Express ที่รันบนคอมเดียวกับ LM Studio → `/api/ai` → LM Studio บน loopback. Online: browser → backend ตรวจ Firebase ID token → provider ที่ผู้ใช้เลือกเท่านั้น. ไม่มีการ fallback ข้าม provider.

เว็บ HTTPS ที่โฮสต์ออนไลน์ไม่สามารถใช้ bridge HTTP ในคอมผู้ใช้ได้อย่างรับประกัน ให้รันเว็บนี้บนเครื่องที่มี LM Studio เพื่อใช้ Local AI. `localhost` บนมือถือคือมือถือ ไม่ใช่คอม. bridge ผูกกับ 127.0.0.1 โดยค่าเริ่มต้น ไม่ควรเปิดพอร์ตโมเดลต่ออินเทอร์เน็ต.

## Production
ตั้ง Firebase และ environment ฝั่ง host, ตั้ง `ALLOW_LOCAL_AI=false`, `HOST=0.0.0.0` เมื่ออยู่หลัง HTTPS reverse proxy ที่เชื่อถือได้ จากนั้น `npm ci`, `npm run build`, `npm start`. Deploy Firestore rules แยกด้วย Firebase CLI. ห้ามอัปโหลด `.env`, service account หรือ `pdf/`. มี Dockerfile และ .dockerignore; Docker build ยังไม่ได้ทดสอบในเครื่องนี้

## ตรวจงาน
```powershell
npm test
npx playwright install chromium
# เปิด npm run dev ไว้อีก terminal
npm run test:e2e
# Java 21+ สำหรับ Firestore Emulator
npm run test:rules
npm run build
npm audit
```

## เอกสารทางการที่ตรวจสำหรับการเชื่อมต่อ (22 ตุลาคม 2026)
- Firebase ใช้ modular web SDK และ transaction: [Web setup](https://firebase.google.com/docs/web/setup), [Transactions](https://firebase.google.com/docs/firestore/manage-data/transactions)
- ตัวอ่าน PDF บนเบราว์เซอร์ใช้ [PDF.js](https://mozilla.github.io/pdf.js/examples/)
- Local adapter ใช้ [LM Studio Chat Completions](https://lmstudio.ai/docs/developer/openai-compat/chat-completions)
- OpenAI ใช้ Responses API, `text.format` JSON schema และ `store: false`: [official OpenAI documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)
- Gemini ใช้ REST generateContent และ `generationConfig.responseFormat.text`: [Gemini structured output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en)
- Claude ใช้ Messages API กับ tool schema: [Claude Messages API](https://platform.claude.com/docs/en/api/messages/create)

ชื่อโมเดลกรอกเองตามสิทธิ์บัญชี/โมเดลที่โหลด ไม่เลือกโมเดลหรือเปลี่ยนผู้ให้บริการอัตโนมัติ การตรวจเอกสารหรือ mock tests ไม่ใช่การยืนยันว่า API จริงเชื่อมต่อสำเร็จ
