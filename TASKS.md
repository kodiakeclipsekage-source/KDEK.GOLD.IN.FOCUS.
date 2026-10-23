# สถานะงาน 22 ตุลาคม 2026

| ขั้น | สถานะ | ตรวจอย่างไร / สิ่งที่รอ |
|---|---|---|
| 1 โครงสร้าง | เสร็จ | React/Vite + Express backend/local bridge; README, .env.example, คู่มือ deploy; health และหน้าเว็บ 200 |
| 2 ข้อมูล/คำนวณ | เสร็จ | แยก transactions/snapshots/imports; Decimal; unit tests ซื้อขาย ยกมา ต้นทุนไม่ครบ ปัดเศษ แยกกลุ่ม และ timestamp กำกวม |
| 3 Manual UI | เสร็จ | CRUD, ค้นหา, กรองวัน, ยืนยันลบ, เปิดข้อมูลเดิม; browser tests ผ่าน |
| 4 PDF | ทำส่วนที่ตรวจได้แล้ว | browser PDF.js รหัสชั่วคราว, เลือกโฟลเดอร์/หลายไฟล์, parser MTS แบบจำกัด, review ก่อน save; ทดสอบรหัสผิดจริงและ PDF สาธารณะ; รอปลดล็อกเอกสารจริงเพื่อตรวจตาราง |
| 5 Firebase | โค้ดเสร็จ / รอ config จริง | Auth email/password, document scope UID, transaction/dedup/conflict, Rules; emulator ผ่าน; ยังไม่เชื่อม production |
| 6 Local AI | โค้ดเสร็จ / รอ endpoint | LM Studio adapter/bridge, loopback guard, timeout, test, ไม่ fallback; contract mock ผ่าน; endpoint จริงไม่พร้อม |
| 7 Online AI | โค้ดเสร็จ / รอ keys | Gemini/OpenAI/Claude, server-only keys, Firebase token, body/rate limits, schema checks, preview/consent; mock tests ผ่าน ไม่มี live test |
| 8 สำรอง/ตรวจรับ | เสร็จส่วน local | JSON version/validation/dedup, desktop/mobile, production build, error tests, privacy checks; test report แยกสิ่งที่ทดสอบจริงและรอตั้งค่า |

เริ่มใช้งานบนเครื่องได้ตาม README ส่วนการรับรอง PDF layout, Firebase production และ AI จริงยังเป็นงานคงเหลือที่ต้องมีข้อมูล/การตั้งค่า ไม่ถือว่าทดสอบผ่านจาก mock หรือการมี adapter เพียงอย่างเดียว
