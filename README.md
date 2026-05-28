# 💰 FinDash AI

> **เว็บแอปจัดการการเงินส่วนบุคคลแบบ Local-first 100%**  
> รองรับสเตทเมนต์ธนาคารไทย • เก็บข้อมูลทั้งหมดในเบราว์เซอร์ด้วย IndexedDB

<p align="center">
  <a href="https://github.com/Icezaza2543/FinDashAI/stargazers"><img src="https://img.shields.io/github/stars/Icezaza2543/FinDashAI?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/Icezaza2543/FinDashAI/issues"><img src="https://img.shields.io/github/issues/Icezaza2543/FinDashAI" alt="Issues"></a>
  <img src="https://img.shields.io/badge/Platform-Browser-0078D6?style=flat&logo=googlechrome&logoColor=white" alt="Browser">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Version-0.4.0-3b82f6?style=flat" alt="Version">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat" alt="License: MIT"></a>
</p>

---

## ✨ คุณสมบัติเด่น

<table>
<tr>
<td width="50%" valign="top">

**🔒 Local-first 100%**  
ข้อมูลทั้งหมดอยู่ในเบราว์เซอร์ (IndexedDB) ไม่มีเซิร์ฟเวอร์ ไม่ส่งข้อมูลออก

**📥 นำเข้าสเตทเมนต์ไทย**  
รองรับ CSV และ XLSX จากธนาคารไทย (รวม TIS-620 / Windows-874) ผ่านเบราว์เซอร์

**🛡️ ป้องกันข้อมูลซ้ำ**  
ระบบ Fingerprint + row identity ตรวจจับรายการซ้ำ (แก้ปัญหา drop รายการซ้ำใน statement เดียวกัน)

**🏦 จัดการหลายบัญชี**  
เพิ่ม แก้ไข ลบ บัญชีธนาคาร/สถาบัน พร้อมยอดคงเหลือจริง

</td>
<td width="50%" valign="top">

**📊 งบประมาณ + เป้าหมายออม**  
ตั้งงบประมาณรายหมวดและเป้าหมายการออมได้เต็มรูปแบบ

**📈 Dashboard เรียลไทม์**  
กราฟกระแสเงินสด โดนัทค่าใช้จ่าย และข้อมูลเชิงลึก (แก้ group ตามวันที่จริง)

**🧠 Categorization อัจฉริยะ**  
หมวดหมู่อัตโนมัติ + สามารถกำหนดกฎเองได้

**📤 Export ข้อมูล**  
ส่งออกธุรกรรมเป็น CSV ดาวน์โหลดได้ทันที

</td>
</tr>
</table>

---

## 🚀 Quick Start (Web App)

ใช้งานง่ายสุดบน Windows: ดับเบิลคลิก `start-findash.cmd`

- ครั้งแรกไฟล์นี้จะติดตั้ง dependencies ให้เองถ้ายังไม่มี `node_modules`
- จากนั้นจะเปิดเว็บที่ http://127.0.0.1:5173 ให้อัตโนมัติ
- ปิดแอปโดยปิดหน้าต่าง command prompt ที่รันอยู่

หรือรันด้วย terminal:

```bash
npm install
npm run dev
```

เปิดเบราว์เซอร์ที่ http://127.0.0.1:5173

- ทุกการทำงาน (CRUD, import CSV/XLSX, export) ทำงานได้ทันทีในเบราว์เซอร์
- ข้อมูลถูกเก็บใน IndexedDB ของเบราว์เซอร์ (local-first, ไม่มี backend)
- Build สำหรับ production: `npm run build` แล้ว `npm run preview`

---

## 📸 ภาพตัวอย่าง

<p align="center">
  <strong>ตัวอย่างการใช้งานจริง (แนะนำ 3-4 ภาพ)</strong>
</p>

<p align="center">
  <img src="docs/screenshots/01-dashboard.png" width="31%" alt="Dashboard" />
  <img src="docs/screenshots/02-import.png" width="31%" alt="Import Statement" />
  <img src="docs/screenshots/03-budgets-goals.png" width="31%" alt="Budgets & Goals" />
</p>

<p align="center">
  <sub>
    💡 วิธีเพิ่มภาพ: วางไฟล์ PNG/JPG ไว้ที่ <code>docs/screenshots/</code><br>
    แล้วอัปเดต path ในตารางด้านบน (แนะนำภาพขนาด 1200-1600px กว้าง)
  </sub>
</p>

---

## 🛠 เทคโนโลยีที่ใช้

| ส่วน | เทคโนโลยี |
|------|-----------|
| **Frontend** | React 19 + Vite |
| **ที่เก็บข้อมูล** | IndexedDB (primary) + localStorage fallback (เวอร์ชันกลาง) |
| **Parser** | papaparse • read-excel-file (browser) + TextDecoder (UTF-8 / windows-874) |
| **Build** | Vite |

---

## 📁 โครงสร้างโปรเจกต์

```
FinDashAI/
├── src/
│   ├── lib/
│   │   ├── financeStore.js   # IndexedDB + CRUD + import/export + categorize
│   │   └── statementParser.js # Browser File parser (Thai encoding + year fix)
│   ├── components/           # UI (dashboard, import, charts...)
│   └── App.jsx
├── public/
└── vite.config.js
```

---

## 🔐 ความเป็นส่วนตัว

> [!IMPORTANT]
>
> FinDash AI ถูกออกแบบมาเพื่อความเป็นส่วนตัวสูงสุดตั้งแต่แรก
>
> - ข้อมูลทั้งหมดเก็บใน **IndexedDB** ของเบราว์เซอร์ (หรือ localStorage fallback)
> - **ไม่มีการเชื่อมต่ออินเทอร์เน็ต** จากตัวแอปเลย (pure client-side)
> - ไม่มี backend / server / telemetry

---

## 📦 การ Build (Web)

```bash
npm run build
npm run preview
```

ไฟล์ production อยู่ที่ `dist/`

---

## 📍 สถานะปัจจุบัน

- ✅ ใช้งานจริงได้ในเบราว์เซอร์ (Chrome/Edge/Firefox)
- ✅ Import CSV/XLSX + Deduplication (แก้ปัญหา drop รายการซ้ำ + 2-digit Buddhist year)
- ✅ CRUD บัญชี, งบประมาณ, เป้าหมาย, โปรไฟล์ (persist ด้วย IndexedDB)
- ✅ Export CSV แบบดาวน์โหลด
- ✅ กราฟ Cashflow กลุ่มตามวันที่จริง (ไม่ใช่แค่ day-of-month)
- ✅ ไม่มี hard limit 1000 rows

---

## 🤝 การมีส่วนร่วม

ยินดีต้อนรับทุก Pull Request และไอเดีย!

ก่อนส่งโค้ด กรุณา:
- รัน `npm run lint` และ `npm run build` ให้ผ่าน
- เขียนโค้ดให้อ่านง่ายและสอดคล้องกับสไตล์เว็บแอป local-first

---

## 📜 สัญญาอนุญาต

โปรเจกต์นี้เผยแพร่ภายใต้สัญญาอนุญาต **[MIT License](LICENSE)**

---

<p align="center">
  <sub>สร้างด้วย ❤️ สำหรับคนที่อยากควบคุมการเงินของตัวเองแบบออฟไลน์แท้จริง</sub>
</p>
