# 💰 FinDash AI

> **แอปเดสก์ท็อปจัดการการเงินส่วนบุคคลแบบ Offline 100%**  
> รองรับสเตทเมนต์ธนาคารไทย • เก็บข้อมูลทั้งหมดในเครื่องด้วย SQLite

<p align="center">
  <a href="https://github.com/Icezaza2543/FinDashAI/stargazers"><img src="https://img.shields.io/github/stars/Icezaza2543/FinDashAI?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/Icezaza2543/FinDashAI/issues"><img src="https://img.shields.io/github/issues/Icezaza2543/FinDashAI" alt="Issues"></a>
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?style=flat&logo=windows&logoColor=white" alt="Windows">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/Electron-42-47848F?style=flat&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Version-0.3.0-3b82f6?style=flat" alt="Version">
</p>

---

## ✨ คุณสมบัติเด่น

<table>
<tr>
<td width="50%" valign="top">

**🔒 Offline 100%**  
ข้อมูลทั้งหมดอยู่ในเครื่อง ไม่มีเซิร์ฟเวอร์ ไม่ส่งข้อมูลออก

**📥 นำเข้าสเตทเมนต์ไทย**  
รองรับ CSV และ XLSX จากธนาคารไทย (รวม TIS-620 / Windows-874)

**🛡️ ป้องกันข้อมูลซ้ำ**  
ระบบ Fingerprint ตรวจจับรายการที่นำเข้าแล้วโดยอัตโนมัติ

**🏦 จัดการหลายบัญชี**  
เพิ่ม แก้ไข ลบ บัญชีธนาคาร/สถาบัน พร้อมยอดคงเหลือจริง

</td>
<td width="50%" valign="top">

**📊 งบประมาณ + เป้าหมายออม**  
ตั้งงบประมาณรายหมวดและเป้าหมายการออมได้เต็มรูปแบบ

**📈 Dashboard เรียลไทม์**  
กราฟกระแสเงินสด โดนัทค่าใช้จ่าย และข้อมูลเชิงลึก

**🧠 Categorization อัจฉริยะ**  
หมวดหมู่อัตโนมัติ + สามารถกำหนดกฎเองได้

**📤 Export ข้อมูล**  
ส่งออกธุรกรรมเป็น CSV ได้ตลอดเวลา

</td>
</tr>
</table>

---

## 🚀 Quick Start

```bash
npm install
npm run electron:dev     # เปิดเป็นแอปเดสก์ท็อป (แนะนำ)
```

หรือเปิดเฉพาะเว็บ UI ด้วย `npm run dev`

---

## 📸 ภาพตัวอย่าง

> **ยังไม่มีภาพหน้าจอ**  
> หากคุณลองใช้แล้ว ช่วยแคปภาพการใช้งานจริงแล้วส่ง Pull Request มาได้เลยครับ (แนะนำเก็บที่ `docs/screenshots/`)

---

## 🛠 เทคโนโลยีที่ใช้

| ส่วน | เทคโนโลยี |
|------|-----------|
| **Frontend** | React 19 + Vite |
| **Desktop** | Electron 42 |
| **ฐานข้อมูล** | SQLite (เก็บในเครื่อง) |
| **Parser** | papaparse • read-excel-file • iconv-lite |
| **Build** | electron-builder |

---

## 📁 โครงสร้างโปรเจกต์

```
FinDashAI/
├── electron/          # Main process, SQLite, Statement Parser
├── src/               # React Components + UI
├── scripts/           # Build utilities
└── public/            # Icons และ static assets
```

---

## 🔐 ความเป็นส่วนตัว

> [!IMPORTANT]
>
> FinDash AI ถูกออกแบบมาเพื่อความเป็นส่วนตัวสูงสุดตั้งแต่แรก
>
> - ไฟล์ฐานข้อมูล `findash.sqlite` อยู่ในโฟลเดอร์ User Data ของผู้ใช้
> - **ไม่มีการเชื่อมต่ออินเทอร์เน็ต** จากตัวแอปเลย
> - Renderer ถูกแยกชั้นความปลอดภัย (`contextIsolation: true`)

---

## 📦 การ Build

```bash
npm run build:exe
```

ไฟล์ติดตั้ง Windows จะถูกสร้างที่ `dist-electron/`

---

## 📍 สถานะปัจจุบัน

- ✅ ใช้งานจริงได้ในโหมด Desktop (Windows)
- ✅ Import CSV/XLSX + Deduplication
- ✅ CRUD บัญชี, งบประมาณ, เป้าหมาย, โปรไฟล์
- 🔄 กำลังพัฒนาเพิ่มเติม (Roadmap จะอัปเดตในอนาคต)

---

## 🤝 การมีส่วนร่วม

ยินดีต้อนรับทุก Pull Request และไอเดีย!

ก่อนส่งโค้ด กรุณา:
- รัน `npm run lint` และ `npm run build` ให้ผ่าน
- เขียนโค้ดให้อ่านง่ายและสอดคล้องกับสไตล์ที่มีอยู่

---

## 📜 สัญญาอนุญาต

โปรเจกต์นี้เผยแพร่ภายใต้ **MIT License**

---

<p align="center">
  <sub>สร้างด้วย ❤️ สำหรับคนที่อยากควบคุมการเงินของตัวเองแบบออฟไลน์แท้จริง</sub>
</p>
