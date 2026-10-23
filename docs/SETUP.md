# การติดตั้งและใช้งาน

## บนเครื่อง
1. ใช้ Node.js 22.13+ หรือ 24 และ `npm ci` (lockfile รวมเวอร์ชันที่ทดสอบแล้ว)
2. `Copy-Item .env.example .env` แล้ว `npm run dev`
3. เปิด http://127.0.0.1:5173 ระบบเริ่มด้วยสมุดว่างบนเบราว์เซอร์นี้
4. เพิ่มรายการด้วยมือ หรือเข้า **นำเข้าเอกสาร → เลือกโฟลเดอร์** แล้วเลือก `D:\KDEK.GoldStatement\pdf`
5. กรอกรหัส PDF ในหน้าเว็บ รหัสถูกล้างหลังอ่านแต่ละรอบ ถ้าเอกสารใช้คนละรหัสให้นำเข้าแยกกัน
6. ตรวจข้อความต้นฉบับและทุกรายการ แก้ช่องที่ขาด เพิ่มแถวที่อ่านไม่ได้ เพิ่มสรุปยอดยกมา/คงเหลือ แล้วเลือกช่องยืนยันก่อนบันทึก

ไม่ต้องส่ง PDF หรือรหัสผ่านไป backend ตัวอย่างจริงในโฟลเดอร์มีการเข้ารหัส จึงยังไม่ได้รับรองว่าตารางตรงกับ parser รุ่นแรก รายละเอียดผลทดสอบอยู่ใน `TEST_REPORT.md` หากเป็นภาพสแกนจะต้องแปลง OCR ด้วยเครื่องมืออื่นก่อน รุ่นนี้ไม่ทำ OCR

ระบบไม่เก็บ PDF ดั้งเดิมหรือข้อความต้นฉบับใน ledger แต่เก็บตัวเลขเป็น string ตามความละเอียดเอกสาร คำนวณด้วย Decimal แยกต่างหาก ข้อมูล manual ให้ใช้เฉพาะเลขอ้างอิงธุรกรรม ห้ามใส่ชื่อหรือเลขบัญชีในช่องผู้ให้บริการ/เลขอ้างอิง

## พื้นที่บนเครื่องและการสำรอง
พื้นที่บนเครื่องเก็บที่ localStorage ของ origin ที่เปิดเว็บ (127.0.0.1 และ localhost เป็นคนละพื้นที่) ปิดแล้วเปิดใหม่ได้ แต่การล้างข้อมูลเบราว์เซอร์จะลบสมุดนี้ด้วย แนะนำส่งออก JSON เป็นประจำ สมุดนี้ไม่เข้ารหัสที่พักและไม่มีล็อกแอป ใช้บัญชี Windows/เบราว์เซอร์ส่วนตัว

JSON `schemaVersion: 1` ประกอบด้วย `transactions`, `snapshots`, `imports` ตรวจ schema ทุกแถว ห้ามมี field ที่ไม่รู้จัก การนำเข้าเป็นการ merge โดยคงต้นฉบับเมื่อซ้ำและแจ้ง conflict เมื่อข้อมูลต่าง ห้ามเขียนทับเงียบ ๆ การย้ายจากพื้นที่บนเครื่องสู่บัญชีใช้ส่งออก → เข้าสู่ระบบ → นำเข้าและยืนยัน

การยืนยันว่าประวัติครบและราคาประเมินอยู่ในค่าตั้งบนเบราว์เซอร์แยกตาม UID ไม่อยู่ใน JSON สำรองหรือ Firestore ต้องตั้งใหม่บนอุปกรณ์ใหม่ ค่าประเมินเป็นราคาที่ผู้ใช้กรอก ไม่มี live price feed

## Firebase
1. สร้างโปรเจกต์ Firebase และลงทะเบียน Web app
2. เปิด Authentication → Email/Password
3. สร้าง Firestore แบบ production และเลือก region ตามต้องการ
4. ใส่ public Web config ใน `.env`: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`
5. Deploy `firestore.rules` ไปยังโปรเจกต์จริง: `npx firebase-tools deploy --only firestore:rules --project YOUR_PROJECT_ID` (ต้อง login Firebase CLI ของคุณก่อน)
6. Restart dev server; production ต้อง build ใหม่ เพราะ `VITE_*` ถูกฝังขณะ build
7. เปิดตั้งค่า สมัครบัญชี/เข้าสู่ระบบ แล้วเพิ่มรายการทดสอบของคุณ ตรวจโหลดกลับได้ ลบรายการทดสอบเมื่อเสร็จ

ข้อมูลเก็บใน `users/{uid}/state/ledger` หนึ่ง document ต่อบัญชี โดยแยก arrays ของธุรกรรม สรุปเอกสาร และประวัตินำเข้า การบันทึกใช้ Firestore transaction อ่านข้อมูลล่าสุดก่อน merge ธุรกรรมระบุด้วย UID ใน path + provider + reference ข้อมูลเดิมต่างกันถือเป็น conflict การแก้ไขด้วยมือตรวจข้อมูลเก่าก่อนเขียนเพื่อกันเขียนทับข้ามแท็บ

รุ่นสมุดส่วนบุคคลจำกัด payload 800 KB และ array ละ 2,000 รายการ เพื่ออยู่ภายในขนาด document ของ Firestore หากต้องการประวัติมากกว่านี้ต้องย้ายเป็น collection รายรายการและ manifest ต่อชุดนำเข้า Rules บังคับ UID, path และชนิดของ envelope; schema ภายในแต่ละแถวตรวจในแอป ไม่ได้บังคับเชิงลึกใน Rules

สำหรับ Online AI backend ต้องตั้ง `FIREBASE_PROJECT_ID` ให้ตรง Web config และใช้ Application Default Credentials หรือ `GOOGLE_APPLICATION_CREDENTIALS` ชี้ไป service-account JSON นอกโปรเจกต์ บน Cloud Run ใช้ service identity ที่มีสิทธิ์ตรวจ token/ผู้ใช้ อย่าใส่ service account ใน `VITE_*` และอย่า commit ไฟล์นี้

## LM Studio (Local AI)
1. โหลดโมเดลที่รองรับ structured JSON ใน LM Studio และ Start Server บน `127.0.0.1:1234`
2. ถ้าเปิด LM Studio authentication ใส่ token ใน `LM_STUDIO_API_KEY` ฝั่ง Express
3. เปิดเว็บจาก Express ที่รันบนคอมเดียวกับ LM Studio
4. ตั้งค่า → เลือก Local → กรอก model identifier ที่โหลด → endpoint เช่น `http://127.0.0.1:1234/v1` → ทดสอบ
5. ปุ่มทดสอบสร้างคำตอบจริงจากข้อมูลจำลอง 1 แถว ไม่มีข้อมูลส่วนตัว และตรวจ schema ไม่ได้อ้างว่าสำเร็จเพียงเพราะเปิดพอร์ตได้

Express เป็น local bridge ผูก `127.0.0.1` และยอมให้เรียกเฉพาะ loopback/same origin จำกัด endpoint ให้เป็น loopback เท่านั้น ไม่มี CORS wildcard และไม่ส่งต่อสู่ Online AI เมื่อพัง รุ่นนี้ไม่เชื่อมเว็บ HTTPS ที่โฮสต์แล้วกับ HTTP bridge ในเครื่อง: ให้ใช้เว็บที่รันในเครื่องสำหรับ Local AI หรือเลือก Online AI ด้วยตนเอง

localhost บนมือถือหมายถึงมือถือ ไม่ใช่คอมของคุณ ถ้าต้องใช้โมเดลจากมือถือ ต้องออกแบบ gateway ที่มี HTTPS และ authentication เพิ่มเติม ห้ามเปิดพอร์ต LM Studio สาธารณะโดยไม่มีการยืนยันตัวตน รุ่นนี้ไม่มี gateway นี้

## Gemini, OpenAI และ Claude (Online AI)
1. ตั้ง key ที่ backend ใน `.env` หรือ secret manager: `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
2. ตั้ง Firebase Admin credentials และเข้าสู่ระบบจาก frontend ก่อนเรียก AI
3. เลือก provider และกรอก model ID ที่บัญชีมีสิทธิ์ใช้งาน ระบบไม่ hardcode ชื่อโมเดลที่อาจหมดอายุหรือสลับ provider ให้เอง
4. กดทดสอบเพื่อทำ inference ด้วยข้อมูลจำลองและตรวจคำตอบจริง ค่าการตั้ง key หมายถึงมี key ใน environment เท่านั้น ไม่ใช่ทดสอบสำเร็จ
5. ที่หน้านำเข้า กดเตรียมตารางสำหรับ AI ตรวจข้อความที่แสดง แล้วติ๊กอนุญาตก่อนส่ง

เฉพาะตารางตัวเลขที่ผ่านการตรวจเท่านั้นที่ส่งออก ชื่อบุคคล/บัญชีและ free text ไม่ผ่าน เลขอ้างอิงเปลี่ยนเป็น ROW_N ไม่ส่งผู้ให้บริการ/ประเภททองแบบ free text, PDF, ชื่อไฟล์ หรือรหัสผ่าน backend ตรวจ Firebase ID token, จำกัด 20 คำขอต่อนาทีต่อ IP และ body 48 KB ตาราง 40,000 ตัวอักษร timeout สูงสุด 120 วินาที ตรวจ schema กับจำนวน/รหัสแถวทุกครั้ง ผล AI ต้องตรวจใหม่ก่อนบันทึก ไม่มี auto-save หรือ fallback

ข้อจำกัด: AI ช่วยจัดตารางที่เตรียมไว้และบรรยายสั้น ๆ รุ่นนี้ยังไม่ส่งข้อความรูปแบบอิสระหรือภาพสแกนให้ AI เพราะต้องทำการลบข้อมูลส่วนตัวที่พิสูจน์ได้ก่อน หาก parser ไม่รู้จัก layout ให้เพิ่มข้อมูลจากข้อความต้นฉบับด้วยมือ ตัวเลขกำไรคำนวณในโค้ด ไม่ใช้ข้อความสรุป AI

## นำขึ้นออนไลน์
โฮสต์ Node เช่น Cloud Run หรือ VPS หลัง HTTPS reverse proxy ที่เชื่อถือได้:
```powershell
npm ci
npm run build
npm start
```
ตั้ง server environment `HOST=0.0.0.0`, `PORT` ตาม host, `ALLOW_LOCAL_AI=false` พร้อม Firebase และ key ที่ต้องการ มี HTTPS, จำกัดคนเข้า host ตามการใช้งานส่วนบุคคล และ deploy Firestore rules ก่อนใช้งานจริง ไม่ต้องส่ง `pdf/`, `.env`, logs, test data หรือ service account เข้า deploy ใช้ `.dockerignore` ที่ให้มาสำหรับ Docker

## การทดสอบ
```powershell
npm test
npx playwright install chromium
# เปิด npm run dev ในอีก terminal ก่อน
npm run test:e2e
# ต้องมี Java 21+; ดาวน์โหลด Firebase CLI/emulator ตอนรัน ไม่ติดตั้ง CLI ใน runtime
npm run test:rules
npm run build
npm audit
```
Tests ใช้ข้อมูลจำลองที่ติดชื่อ SYNTHETIC/TEST DATA ใน context เบราว์เซอร์ใหม่ ไม่เข้า ledger จริง การทดสอบ PDF แบบเข้ารหัสใช้ไฟล์ใน `pdf/` เฉพาะรหัสผิด ไม่คัดลอกเนื้อหาหรือส่งไฟล์ออก network หากไม่มี PDF จะข้าม test นั้น
