# ผลทดสอบ KODIAK Gold Ledger

## อ่าน PDF ต้นฉบับที่เข้ารหัสจริง — 23 ตุลาคม 2026

- เปิดเอกสาร MTS วันที่ 17 ตุลาคม 2026 ด้วยรหัสที่ผู้ใช้ให้ และเทียบภาพตารางกับข้อความจาก PDF.js จริง พบว่าตัวอ่านเดิมรองรับข้อความเรียงคอลัมน์ แต่ PDF.js คืนตารางแบบแถว
- เพิ่ม parser แบบแถว: ตรวจหัวตาราง ลำดับช่อง วันเวลา เลขอ้างอิง น้ำหนัก/ราคาที่ตรงกันระหว่างสองตาราง ยอดรวมซื้อ/ขายและขาเข้า/ขาออก รองรับรายการซื้อ GLDOZUSD เดียวพร้อม B/F; ข้อมูลหลายรายการ รูปแบบไม่ครบ หรือข้อมูลขัดกันให้ตรวจด้วยมือ
- อ่านได้ 1 BUY: เวลา 00:37:00, น้ำหนัก 0.00240 OZ, ราคา 4162.66 USD/OZ, ยอด 10.00 USD; แยก B/F 0.00241 OZ ที่ต้นทุนเฉลี่ย 4149.38 ออกจากธุรกรรม และปิดที่ 0.00481 OZ / เฉลี่ย 4158.00
- ทดสอบไฟล์จริงผ่านหน้านำเข้าใน browser context แยก: ก่อนยืนยันไม่มีข้อมูลบันทึก, นำเข้าซ้ำสองรอบได้เพียง 1 transaction และ 1 snapshot, ไม่มี POST requests ตรวจหน้าทบทวนบน desktop/mobile แล้ว ไม่เขียนข้อมูลเข้าบัญชีผู้ใช้จริง ไม่บันทึกรหัสผ่านไว้ในซอร์สหรือ fixtures
- `npm test`: ผ่าน 35 กรณี ข้าม Firestore Emulator 1; browser tests ผ่าน 14 กรณี รวม fixtures แบบแถวและคอลัมน์; `npm run build` ผ่าน

## Refactor เป็น HTML / CSS / JavaScript — 23 ตุลาคม 2026

- เปลี่ยน entry เป็น `index.html` + `src/main.js` และหน้าจอทั้งหมดเป็น ES modules ใช้ native DOM แทน React / JSX คง CSS, schema, การคำนวณ, storage และ backend เดิม นำ React, React DOM และ lucide-react ออกจาก dependencies; ใช้ SVG icons พร้อม license ใน `public/licenses/lucide.txt`
- `npm test`: ผ่าน 31 กรณี ข้าม Firestore Emulator 1 กรณีเพราะไม่ได้เปิด emulator
- `npm run test:e2e` บน dev: ผ่าน 13 กรณี รวม CRUD, JSON import/export และ conflict, PDF password/validation, ฟอร์ม 7 ช่อง, responsive 1440/390 px, focus/caret/keyboard ใน dialog, ไฟล์ที่เลือกและข้อความต้นฉบับที่เปิดไว้, สรุปรายวัน, preferences, AI settings และการทิ้งผลอ่าน PDF ที่กลับมาหลังเปลี่ยนหน้า
- `npm run build`: ผ่าน; production browser tests บนพอร์ต 5180 ผ่าน 11 กรณี ข้าม 2 กรณีที่แทนโมดูล PDF เฉพาะ dev ตรวจภาพ desktop/mobile แล้ว
- การทดสอบ AI ใช้ mock และไม่ส่งข้อมูลไป provider จริง ไม่ได้ทดสอบ Firebase account หรือ deploy ในรอบนี้ Build ยังแจ้งขนาด Firebase chunk และ annotation ของ Zod ซึ่งไม่ทำให้ build ล้มเหลว

## MTS แบบข้อความเรียงเป็นคอลัมน์ — 23 ตุลาคม 2026

- เพิ่มตัวแยกตามข้อความจากเอกสารที่ผู้ใช้ส่งมา: ตารางรายการซื้อขายและสรุปเคลื่อนไหวที่มี B/F กับ BUY ซ้ำเลขรายการเดียวกัน สร้างธุรกรรมเพียง 1 รายการ ใช้เลขรายการจริงเป็นรหัสอ้างอิงกันซ้ำ
- ได้ 17/10/2026 00:37:00, GLDOZUSD, ซื้อ 0.00240 OZ, ราคา 4162.66, ยอดซื้อ 10.00, คงเหลือ 0.00481 OZ, เฉลี่ย 4158.00; แยกยอดยกมา 0.00241 และเฉลี่ยยกมา 4149.38 เป็น checkpoint ไม่ใช่รายการซื้อ
- tests จากข้อความรูปแบบจริง (เปลี่ยนเลขอ้างอิงใน fixture): ผ่านทั้งบรรทัดเดียวและแบบขึ้นบรรทัดใหม่, นำเข้าซ้ำ, และปฏิเสธรายการหลายรายการ/รหัสไม่ตรง/ขาออกไม่เป็นศูนย์ที่ยังไม่รองรับ
- Browser test ผ่าน: แทนเฉพาะผลดึงข้อความ PDF ด้วย fixture แล้วทดสอบ parser จริง → หน้าตรวจเติม 7 ช่องอัตโนมัติ ไม่มีคำเตือน → ยืนยัน → บันทึก local ledger 1 transaction/1 snapshot โดยไม่เขียนเข้าบัญชีจริง การทดสอบนี้ใช้ Vite dev และข้ามเมื่อทดสอบ production
- ทดสอบกับข้อความที่ส่งมาแล้ว แต่ยังไม่ได้ปลดล็อกและอ่าน PDF ต้นฉบับด้วยรหัสที่ถูกต้องในเครื่องนี้ รุ่นนี้รองรับแบบคอลัมน์ที่มี BUY เดียวกับยอด B/F; layout หลายธุรกรรมที่กำกวมให้ตรวจด้วยมือ

## แก้หน้าที่แยก PDF ได้ 0 รายการ — 23 ตุลาคม 2026

- แสดงฟอร์ม 7 ช่องทันทีเมื่ออ่านข้อความได้แต่ไม่พบธุรกรรม ปิด checkbox ยืนยันจนกว่าจะมีข้อมูลที่นำเข้าได้ เมื่อใช้ข้อมูลที่กรอกเองจะล้างข้อความจากการแยกอัตโนมัติที่ล้มเหลว และตรวจข้อมูลที่กรอกก่อนแสดงหน้าทบทวน
- เพิ่ม parser สำหรับบรรทัด date/time + GLDOZUSD BUY หรือ BUY GLDOZUSD + weight/price/amount และยอด Closing Balance/Average Price ไม่สมมติยอดที่หายหรือแปลง SELL เป็น BUY
- unit/API tests ผ่าน 28 กรณี ข้าม emulator 1; browser tests ผ่าน 8 กรณี รวมกรอก 7 ช่องโดยตรงหลังแยกไม่ได้; production build ผ่าน
- ยังต้องมีข้อความตารางที่ถอดจาก PDF จริง เพื่อรับรอง column layout ของเอกสารส่วนตัว ไม่ถือว่าการผ่าน test fixture เป็นการอ่านไฟล์จริงสำเร็จ

## KDEK Studio UI — 23 ตุลาคม 2026

- เปลี่ยน UI ทุกหน้าเป็น Studio Design System จากโฟลเดอร์ที่ให้มา: สีดำ/ขาวนวล/แดง, THE BOLD FONT และ Kanit, โลโก้จริง, header 84.5/76 px, badge 57×64.5/40×45 px, radius 4 px และ controls อย่างน้อย 44 px
- สร้าง token/typography CSS จาก source configuration โดยใช้ generator ของชุดดีไซน์เดิม ไม่มีการแก้ kit dist หรือใช้ Google Fonts; คัดลอกไฟล์ฟอนต์และ license ไว้พร้อม build
- `npm run build` ผ่าน; browser tests 8 กรณีผ่าน รวม manual CRUD, JSON, PDF error handling และฟอร์มนำเข้า 7 ช่อง พร้อมตรวจภาพบน desktop/mobile
- ตรวจ production โดยบล็อก network ภายนอก: Kanit/THE BOLD FONT โหลดได้จาก local, พื้นหลัง RGB(17,17,17), brand #E91632, badge 57×64.5 px ตรง tokens; ไม่มี page errors และหน้าภาพรวมไม่ล้นที่ 320/390/760/1024/1440 px
- การปรับครั้งนี้แก้เฉพาะการนำเสนอและการเตรียม assets ข้อมูลและการคำนวณใช้โมดูลเดิม

## ปรับนำเข้าเหลือ 7 ช่องตามคำขอเพิ่มเติม

- ข้อมูลตัวอย่าง GLDOZUSD: `17/10/2026 00:37`, `0.00240 OZ`, `4162.66`, `10.00`, คงเหลือ `0.00481 OZ`, เฉลี่ย `4158.0` ผ่าน parser, validation, merge และ dedup โดยไม่ต้องกรอกยอดยกมาหรือเลขอ้างอิง
- เก็บตัวเลขเป็น string และแสดงครบตามจำนวนทศนิยมเดิม ยอดยกมาที่ไม่ทราบเป็น null ไม่มีการคำนวณย้อนหลังเพื่อสมมติยอดยกมา
- ทดสอบล่าสุด: unit/API ผ่าน 26 กรณี ข้าม emulator 1 กรณี; browser ผ่าน 8 กรณี รวมฟอร์ม/หน้าตรวจที่มี 7 ช่องและบันทึกแยก transaction กับ snapshot; ไม่มีการนำข้อมูลตัวอย่างลงสมุดจริง
- รองรับข้อความที่มี label ตาม 7 ช่องที่ส่งมา ไม่ได้ยืนยันการถอดตารางจาก PDF เข้ารหัสจริงด้วยรหัสที่ถูกต้อง
- การกันซ้ำเมื่อเอกสารไม่มีเลขอ้างอิงใช้วันเวลา ประเภททอง น้ำหนัก ราคา และจำนวนเงิน หากธุรกรรมจริงสองรายการมีค่าทั้งหมดนี้ตรงกัน ต้องใช้การบันทึกแบบมีเลขอ้างอิงเพื่อแยกสองรายการ

วันที่ตรวจ: 22 ตุลาคม 2026 (Asia/Bangkok), Windows, Node 24.12.0, Chromium 156 ผ่าน Playwright

## ทดสอบจริงแล้วบนเครื่องนี้

| งาน | ผล | ขอบเขต |
|---|---|---|
| `npm run build` | ผ่าน | ผลิตไฟล์ production ใน dist |
| `npm test` | ผ่าน 22, ข้าม 1 | การคำนวณ, validation, parser fixture, AI adapters แบบ mock และ HTTP API; ข้าม emulator เมื่อไม่ได้เปิด |
| Firestore Emulator | ผ่าน | ทดสอบ owner Alice อ่านเขียนได้; Bob และ guest อ่าน/เขียนของ Alice ไม่ได้; field envelope ที่ไม่รู้จักถูกปฏิเสธ; นำเข้าซ้ำไม่เพิ่ม; conflict ไม่เขียนทับ |
| Playwright บน dev | ผ่าน 7 กรณี | CRUD, reload, search, delete confirmation, JSON, รหัส PDF, PDF สาธารณะ และหน้าจอ |
| Playwright บน production | ผ่าน 7 กรณี | ชุดเดียวกัน เพิ่ม PDF ข้อความสาธารณะ: อ่านได้บนอุปกรณ์, unknown layout เข้า review, ยังไม่บันทึก |
| Layout | ผ่าน | ตรวจภาพ screenshot ที่ 1440 px และ 390 px; ทุกหน้าไม่มี horizontal overflow ของ document; ตารางเลื่อนภายในได้ |
| PDF ตัวอย่างส่วนตัว | ผ่านเฉพาะการเข้ารหัส | ไม่ใส่รหัสแจ้งต้องใช้รหัส; รหัสผิดแจ้งผิด; ล้างช่องรหัสหลังลอง; ไม่เกิด POST หรือบันทึก localStorage |
| PDF สาธารณะ | ผ่าน | Mozilla helloworld.pdf เปิด/ดึงข้อความได้บนเบราว์เซอร์; ไม่รู้จัก layout จึงไม่สร้างธุรกรรมสมมติ |
| สำรอง JSON | ผ่าน | preview ไม่เขียนก่อนยืนยัน, import/export, dedup, conflict, schemaVersion ผิด/field เกินถูกปฏิเสธ |
| AI adapters | ผ่านด้วย mock | Local/OpenAI/Gemini/Claude รับผลรูปแบบเดียวกัน; JSON/schema ผิด/จำนวนแถวผิด/timeout/offline/429/key ขาดไม่ fallback |
| HTTP API | ผ่าน | Online ไม่มี token/ผิด token → 401; Local foreign Origin → 403; field password → 400; body ใหญ่ → 413; เกินอัตรา → 429 |
| ไฟล์ส่วนตัว | ผ่าน | เรียก `/pdf/` ผ่านเว็บถูกปฏิเสธ 403; Vite deny private paths และ environment |
| Dependencies | ผ่าน | `npm audit` และ `npm audit --omit=dev`: 0 vulnerabilities ณ วันตรวจ |

Firestore Emulator ใช้โปรเจกต์ `demo-kodiak` และบัญชีจำลอง ไม่มีการสร้างข้อมูลใน Firebase จริง ครั้งที่รันใน emulator ชุดทดสอบผ่าน 21 กรณี (ก่อนเพิ่ม unit tests อีกสองกรณีเรื่องลำดับเวลาและค่ากำกวม) Rules integration ไม่ได้เปลี่ยนหลังการทดสอบ

การคำนวณครอบคลุม buy/sell พร้อม fee, ยกมาที่ต้นทุนทราบ/ไม่ทราบ, ไม่บวกยอดปิดรายวันสะสม, ขายเกินประวัติ, ประวัติไม่ครบ, ไม่รวมต่างกลุ่ม, Decimal/rounding และไม่อ้างลำดับซื้อขายเมื่อ timestamp เท่ากันแต่ประเภทต่างกัน

การตรวจข้อมูลส่วนตัวครอบคลุม schema ที่ปฏิเสธ field เกิน, export ไม่มีรหัส/key/ชื่อไฟล์, PDF ไม่ POST, safe table ยอมรับเฉพาะคอลัมน์ตัวเลขและ enums, เลขอ้างอิงเป็น ROW_N การป้อนชื่อหรือบัญชีด้วยมือในช่องข้อความเป็นข้อผิดพลาดของข้อมูลที่แอปตรวจเชิงความหมายไม่ได้ จึงมีคำแนะนำไม่ให้กรอกข้อมูลเหล่านั้น

## รอการตั้งค่าหรือข้อมูลจริง

| ส่วน | สถานะ |
|---|---|
| ตารางใน PDF ส่วนตัวที่เข้ารหัส | ยังไม่ได้ทดสอบรหัสที่ถูกต้องหรือเทียบตัวเลข/ตำแหน่งคอลัมน์จริง; กรอกรหัสที่หน้าเว็บเพื่อเริ่มตรวจ |
| MTS parser กับใบรายงานจริง | ยังไม่รับรอง; ผ่านเฉพาะ text fixture จำลองแบบ date/time/type/reference/weight/price/amount/fee; layout อื่นเข้าการตรวจด้วยมือ |
| Firebase Authentication/Firestore production | ยังไม่มี Web config/Admin credentials; ยังไม่ทดสอบ login จริงหรือ deploy Rules |
| LM Studio | ตรวจ `127.0.0.1:1234/v1/models` แล้วติดต่อไม่ได้; ยังไม่ inference กับโมเดลจริง |
| Gemini/OpenAI/Claude | backend รายงานยังไม่มี key ทั้งสาม; ไม่ได้เรียก API จริง |
| Docker/cloud deployment | มี source/ขั้นตอน แต่ยังไม่ได้ build Docker image หรือนำขึ้น host จริง |

## ข้อจำกัดที่ส่งต่อ

- ไม่มี OCR; scanned PDF ต้องแปลงด้วยเครื่องมืออื่น รุ่นแรกไม่ใช้ AI อ่านภาพหรือ arbitrary raw text ที่อาจมีข้อมูลส่วนตัว
- AI จัดตารางที่เตรียมและลบข้อมูลส่วนตัวแล้ว ไม่ได้แก้ layout ที่ไม่รู้จักโดยส่งต้นฉบับขึ้น cloud
- หนึ่งสมุดจำกัด 800 KB/array ละ 2,000 รายการ; ข้อมูลบนอุปกรณ์อยู่ในเบราว์เซอร์เดียว ไม่ซิงก์อัตโนมัติ
- ไม่เข้ารหัส ledger ใน localStorage; การตั้งราคาประเมินและยืนยันประวัติครบอยู่บนอุปกรณ์แยก UID ไม่อยู่ใน JSON backup
- รองรับ g, baht, oz, kg และ THB, USD, EUR แบบแยกกลุ่ม ไม่มีการแปลงหน่วย/FX และไม่มีราคาตลาดอัตโนมัติ
- ปุ่ม AI ทดสอบเป็น inference จริงเมื่อมี config/model พร้อม อาจมีค่า API; ก่อนพร้อมจะแจ้งข้อผิดพลาดตามจริง
- Production build มีคำเตือนขนาด Firebase chunk และการลบ annotation จาก dependency Zod; build สำเร็จและหน้า production ทดสอบผ่าน
- ใช้โลโก้และฟอนต์ local จาก KDEK Studio พร้อมไฟล์สิทธิ์; icon เป็น SVG ไม่มีข้อมูลลงทุนจำลองใน UI

## White / gray / gold / black UI — 23 October 2026

- Updated the app palette in `src/theme.css`: white `#FFFFFF`, gray `#F3F3F0`, gold `#C4A35A`, and black `#171816`. Shared KDEK typography, spacing, and local font assets remain in use.
- Applied the palette to navigation, dashboard, tables, forms, import review, dialogs, and notifications. Dark surfaces use light text; gold buttons use dark labels. The logo is displayed in grayscale through CSS.
- `npm run build` passed. Existing dependency annotation and bundle-size warnings remain.
- `npm run test:e2e` passed all 9 cases, including responsive pages at 1440 and 390 pixels, manual CRUD, JSON import/export, PDF handling, and the seven-field import review.
- Visually reviewed the desktop and mobile overview, desktop seven-field review, and mobile import screenshots in `tmp/screens/`. No business logic changed for this palette update.

## Red accents added — 23 October 2026

- Added red `#E91632` to the white/gray/gold/black palette for banner markers, active-menu dots, and brand accents; dark red text preserves readability on light surfaces. Destructive actions and error messages now use red variants. Restored the logo's original colors by removing its grayscale filter.
- `npm run build` passed; `npm run test:e2e` passed all 9 cases. Reviewed updated overview screenshots at 1440 and 390 pixels.
