# FinDash AI

FinDash AI เป็นแอปเดสก์ท็อปแบบ offline สำหรับจัดการการเงินส่วนบุคคลบน Windows ด้วย React + Electron

## สถานะปัจจุบัน

- รันเป็น Electron desktop app ได้
- นำเข้า statement จากไฟล์ `.csv` และ `.xlsx`
- บันทึกข้อมูลลง SQLite local database ผ่าน Electron main process
- มี dedupe จาก fingerprint เพื่อป้องกัน import ซ้ำ
- มี rule-based categorization พื้นฐาน
- Dashboard อ่าน accounts/transactions/profile จาก local database เท่านั้น ไม่มีข้อมูลจำลองสำรอง
- เพิ่ม แก้ไข และลบบัญชีได้จริง รวมถึงชื่อบัญชี ธนาคาร/สถาบัน ประเภท และยอดคงเหลือ
- แก้ไขโปรไฟล์ผู้ใช้ได้จริงผ่าน SQLite
- เพิ่ม แก้ไข และลบงบประมาณกับเป้าหมายออมได้จริง
- ไม่ใช้ Tauri/Rust แล้ว

## Prerequisites

- Node.js >= 20
- Windows สำหรับการ build `.exe`

## ติดตั้ง

```bash
npm install
```

## Development

รัน web UI อย่างเดียว:

```bash
npm run dev
```

เปิดที่ `http://127.0.0.1:5173`

รัน Electron desktop app:

```bash
npm run electron:dev
```

สคริปต์นี้จะรัน Vite และ Electron พร้อมกัน โดยรอ port `5173` ก่อนเปิด desktop window

## Build

Build renderer:

```bash
npm run build
```

Build Windows installer:

```bash
npm run build:exe
```

ไฟล์ installer จะถูกสร้างใน `dist-electron/`

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run electron:dev` | Start Vite + Electron desktop app |
| `npm run build` | Build renderer assets |
| `npm run electron:build` | Build renderer and package Electron app |
| `npm run build:exe` | Alias for Electron packaging |
| `npm run preview` | Preview built renderer |
| `npm run lint` | Run ESLint |
| `npm run format` | Format source files |
| `npm run smoke:production` | Smoke test parser + SQLite + dedupe with Electron runtime |

## Project Structure

```text
electron/
  main.js              Electron main process + IPC handlers
  preload.js           Safe renderer bridge
  database.js          SQLite schema, seed data, import persistence
  statementParser.js   CSV/XLSX parsing, date/amount normalization
scripts/
  start-electron.cjs   Electron launcher that clears ELECTRON_RUN_AS_NODE
src/
  components/          React UI components
  data/                Static filter and navigation options
  utils/               Formatting helpers
  App.jsx              Main dashboard
```

## Local Data

SQLite database is stored under Electron `app.getPath("userData")` as `findash.sqlite`.

The default schema includes:

- `accounts`
- `user_profile`
- `budgets`
- `goals`
- `categories`
- `category_rules`
- `import_batches`
- `transactions`

## Import Notes

- CSV supports UTF-8 and TIS-620/Windows-874 detection.
- Excel support is intentionally limited to `.xlsx`.
- Legacy `.xls` is not enabled for production safety.
- Duplicate transactions are skipped by fingerprint: account + date + normalized title + amount.

## Verification

Recommended checks before packaging:

```bash
npm run lint
npm run build
npm run smoke:production
npm audit --omit=dev
```

## Production Notes

- Electron renderer has `contextIsolation: true` and `nodeIntegration: false`.
- Renderer talks to backend only through `window.electronAPI`.
- Content Security Policy is defined in `index.html`.
- Tauri/Rust files and dependencies have been removed from the production path.
