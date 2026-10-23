# Studio Design System · v1

ชุดดีไซน์กลางของ KODIAK ECLIPSE KAGE / KDEK STUDIO. ใช้ฟอนต์ สี โลโก้ เมนู หน้าโหลด และระบบเดียวกันกับเว็บไซต์พอร์ตโฟลิโอ

## เริ่มเว็บของทีม

ใช้ Node.js 20 ขึ้นไป ไม่มีขั้นตอนติดตั้ง package สำหรับชุดเริ่มต้น

```sh
npm run build
npm start
```

เปิด `http://localhost:4173` ผ่าน HTTP เพื่อให้เส้นทาง assets จาก `/` ทำงาน วางเว็บไซต์ที่ root ของโดเมน ถ้าจะใช้ subdirectory ต้องปรับ asset paths ด้วย

แก้ `src/pages/index.html` หรือ `design-system/starter/index.html` เพื่อเปลี่ยนเนื้อหาหน้าเว็บ แล้ว `npm run build` ทุกครั้งก่อน deploy นำโฟลเดอร์ `dist/` ไปใช้กับ static hosting ได้

## แก้ตรงไหน

| ตำแหน่ง | หน้าที่ |
| --- | --- |
| `design-system/brand.json` | ชื่อบริษัท/สตูดิโอ อีเมล สถานที่ และโลโก้หลักของแม่แบบ |
| `design-system/tokens/typography.json` | THE BOLD FONT, Kanit, JP, CN และน้ำหนัก |
| `design-system/tokens/colors.json` | สีแบรนด์ สีปุ่ม พื้นหลัง และสีข้อความ |
| `design-system/tokens/layout.json` | กรอบโลโก้ Header ระยะห่าง และขนาดหน้าจอมือถือ |
| `design-system/tokens/motion.json` | เวลาเปิด/ปิดชัตเตอร์และความเร็ว Loader |
| `design-system/components/topbar/` | โครงสร้างแถบบน เมนู สลับภาษา และวันที่ |
| `design-system/components/bottom-bar/` | Footer ปุ่มติดต่อ และกลับขึ้นบน |
| `design-system/components/loader/` | Loader มาสคอต guard และการเตรียม assets |
| `design-system/components/logo/` | ตำแหน่ง ขนาด โลโก้ และทะเบียนสตูดิโอ |
| `design-system/components/attention/` | คำชวนคลิกและลูกศรโปรเจกต์ |
| `design-system/systems/` | Media, Navigation, Motion, Colour Study และ Shutter |
| `design-system/starter/` | หน้าเริ่มต้นของเว็บใหม่และข้อความสี่ภาษา |
| `src/pages/` | เนื้อหา/เลย์เอาต์เฉพาะเว็บ |
| `dist/fonts`, `dist/teams`, `dist/animations` | ไฟล์สื่อและฟอนต์ที่ใช้งานร่วมกัน |
| `dist/` ไฟล์ HTML/CSS/JS | ผลลัพธ์จาก build; แก้ที่ต้นฉบับด้านบน |

ค่าใน Tokens ถูกนำไปใช้ทั้ง CSS จริงและตัวอย่าง BOLD BY DESIGN รวมถึงคำอธิบายฟอนต์ อย่าแก้ค่าที่สร้างแล้วใน `dist/studio-tokens.css` เพราะ build ครั้งถัดไปจะเขียนทับ

## มาตรฐานแบรนด์

- EN / Display: THE BOLD FONT
- TH / Content: Kanit 600 สำรอง Noto Sans Thai; เนื้อหาเรซูเม่ยาวใช้ 400 / 500
- JP / Content: Noto Sans JP 600
- CN / Content: Noto Sans SC 600
- แดงแบรนด์ `#E91632`; แดงปุ่ม/เมนู `#EF1632`
- Badge: Desktop 57 × 64.5 px; Mobile 40 × 45 px; artwork อยู่ครบด้วย contain
- Header: Desktop 84.5 px; Mobile 76 px
- การเคลื่อนไหวรองรับ prefers-reduced-motion และปุ่มรองรับ focus / คีย์บอร์ด

JP/CN/Noto fallback ยังใช้ Google Fonts แบบ display=swap; Kanit และ Bold อยู่ในชุดไฟล์นี้ เมื่อเปลี่ยนฟอนต์ใน config ให้ใส่ไฟล์ฟอนต์/Google family ที่ตรงกันด้วย

## ใช้โลโก้ร่วมกัน

แก้ `design-system/components/logo/studios.js` เป็นแหล่งเดียวสำหรับชื่อและรูปทีม ใช้ `data-studio-logo="kdek"`, `data-studio-name="kdek"`, `data-studio-link="kdek"` ในหน้าเว็บ แล้วโหลด `/studios.js` จึงปรับตามทะเบียนเดียวกัน

แยกโลโก้บริษัทออกจากโลโก้เครดิตทีม: `brand.json` คุมบริษัทของเว็บใหม่ ส่วน `studios.js` คุมสตูดิโอ/ผู้รับผิดชอบ Link ของสตูดิโอชี้ไป `/#<section>` จึงต้องมี section จริงในเว็บใหม่หรือเปลี่ยน link ใน registry ให้ตรง

## ประกอบส่วนต่าง ๆ

```html
{{include:design-system/components/topbar/topbar.html}}
{{include:design-system/components/loader/loader.html}}
```

`{{design:head}}` ใส่ Tokens และฟอนต์ local; `{{design:international-fonts}}` เพิ่ม Noto สำหรับหน้าเว็บที่มี JP/CN; `{{design:font-samples}}` และ `{{design:colour-samples}}` แสดงตัวอย่างจาก config

ไฟล์ CSS/JS ร่วมกันถูกสร้างตาม `build-manifest.json` เป็นชื่อ URL เดิม เพื่อให้แคชและการนำไปใช้ต่อไม่เปลี่ยน โค้ด inline ในหน้าแรกประกอบจากไฟล์ย่อยตอน build จึงไม่เพิ่มการเรียก JS หลายไฟล์ตอนโหลดหน้า

Loader ต้องมี critical guard ใน head และ markup ใน body ตามแม่แบบ: มันรอเฉพาะสิ่งจำเป็นที่จุดเข้าเว็บ พร้อม timeout ไม่รอวิดีโอทุกคลิป ส่วน Shutter / Media / Attention เป็นระบบแยกที่เลือกใช้เมื่อหน้านั้นมีเนื้อหารองรับ อย่าโหลดทุกระบบในทุกหน้าโดยไม่มีเหตุผล

แม่แบบเริ่มต้นมีเมนู ภาษา Footer ติดต่อ และ Loader พร้อมใช้งาน การเพิ่มหน้ารายละเอียดโปรเจกต์/เรซูเม่และสื่อต่าง ๆ เป็นเนื้อหาของเว็บใหม่ ชุดเริ่มต้นไม่คัดลอกผลงานหรือประวัติส่วนตัวจากพอร์ตเดิม

## ให้ทุกเว็บเหมือนกันต่อไป

ใช้เวอร์ชันเดียวกันของ `design-system/` และ Tokens เพื่อให้ขนาด/รูปแบบตรงกัน แก้เนื้อหาในหน้าเว็บแทนการเพิ่ม CSS override ให้แต่ละทีม การแก้ชุดต้นทางนี้ไม่ได้อัปเดตเว็บที่นำชุดไฟล์ไปใช้แล้วโดยอัตโนมัติ: นำเวอร์ชันใหม่เข้าเว็บนั้น build และ deploy อีกครั้ง

ไฟล์สิทธิ์ฟอนต์และไอคอนอยู่ใน `dist/fonts/` และ `dist/licenses/` เก็บไว้เมื่อนำชุดไฟล์ไปใช้ต่อ
