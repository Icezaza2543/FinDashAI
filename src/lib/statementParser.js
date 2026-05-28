// Browser-compatible statement parser for FinDash AI webapp.
// Uses File API and TextDecoder so imports stay fully client-side.

import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file/browser';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(['.csv', '.xlsx']);

const THAI_MONTHS = {
  'ม.ค.': 1, 'มกราคม': 1,
  'ก.พ.': 2, 'กุมภาพันธ์': 2,
  'มี.ค.': 3, 'มีนาคม': 3,
  'เม.ย.': 4, 'เมษายน': 4,
  'พ.ค.': 5, 'พฤษภาคม': 5,
  'มิ.ย.': 6, 'มิถุนายน': 6,
  'ก.ค.': 7, 'กรกฎาคม': 7,
  'ส.ค.': 8, 'สิงหาคม': 8,
  'ก.ย.': 9, 'กันยายน': 9,
  'ต.ค.': 10, 'ตุลาคม': 10,
  'พ.ย.': 11, 'พฤศจิกายน': 11,
  'ธ.ค.': 12, 'ธันวาคม': 12,
};

const FIELD_ALIASES = {
  date: ['date', 'transactiondate', 'postingdate', 'valuedate', 'วันที่', 'วันที่ทำรายการ', 'วันเดือนปี'],
  title: ['title', 'รายการ', 'ประเภทรายการ'],
  detail: ['description', 'detail', 'details', 'memo', 'รายละเอียด', 'คำอธิบาย'],
  amount: ['amount', 'transactionamount', 'จำนวนเงิน', 'ยอดเงิน', 'จำนวน'],
  debit: ['debit', 'withdrawal', 'withdraw', 'paidout', 'ถอน', 'เงินออก', 'เดบิต', 'จ่าย'],
  credit: ['credit', 'deposit', 'paidin', 'ฝาก', 'เงินเข้า', 'เครดิต', 'รับ'],
};

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s_./:()[\]-]+/g, '');
}

function headerMatches(header, aliases) {
  const normalized = normalizeHeader(header);
  return aliases.some((alias) => normalized.includes(normalizeHeader(alias)));
}

function getValue(row, field) {
  const aliases = FIELD_ALIASES[field];
  const key = Object.keys(row).find((header) => headerMatches(header, aliases));
  return key ? row[key] : undefined;
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function parseAmount(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const raw = String(value).trim();
  const negative = /^\(.*\)$/.test(raw) || /-$/.test(raw);
  const normalized = raw.replace(/,/g, '').replace(/[^\d.-]/g, '');
  const amount = Number.parseFloat(normalized);
  if (!Number.isFinite(amount)) return 0;
  return negative ? -Math.abs(amount) : amount;
}

function getRowAmount(row) {
  const amountValue = getValue(row, 'amount');
  if (hasValue(amountValue)) {
    return { amount: parseAmount(amountValue), hasAmount: true };
  }

  const creditValue = getValue(row, 'credit');
  const debitValue = getValue(row, 'debit');
  const hasCredit = hasValue(creditValue);
  const hasDebit = hasValue(debitValue);
  const credit = Math.abs(parseAmount(creditValue));
  const debit = Math.abs(parseAmount(debitValue));
  return { amount: credit - debit, hasAmount: hasCredit || hasDebit };
}

function toIsoDate(year, month, day) {
  let y = Number(year);
  if (y > 2400) y -= 543; // Buddhist year to Gregorian
  if (!y || !month || !day) return '';
  return `${String(y).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function normalizeTwoDigitYear(rawYear) {
  if (rawYear >= 100) return rawYear;
  // Thai statements commonly use Buddhist short years from 50-99 (67 => 2567 => 2024).
  // Keep lower values compatible with Gregorian short years (24 => 2024).
  return rawYear >= 50 ? 2500 + rawYear : 2000 + rawYear;
}

function parseDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + value * 86400000);
    return date.toISOString().slice(0, 10);
  }

  const text = String(value).trim().replace(/\s+/g, ' ');

  let match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (match) {
    return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  // DD/MM/YY or DD/MM/YYYY - Thai statements often use Buddhist short year (67 = 2567 -> 2024)
  match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (match) {
    const rawYear = normalizeTwoDigitYear(Number(match[3]));
    return toIsoDate(rawYear, Number(match[2]), Number(match[1]));
  }

  // Thai month names e.g. 31 พ.ค. 2567 or 31 พ.ค. 67
  match = text.match(/^(\d{1,2})\s+([^\s]+)\s+(\d{2,4})$/);
  if (match) {
    const month = THAI_MONTHS[match[2]];
    const rawYear = normalizeTwoDigitYear(Number(match[3]));
    return toIsoDate(rawYear, month, Number(match[1]));
  }

  return text;
}

async function decodeCsvFile(file) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  const utf8Score = (utf8.match(/\uFFFD/g) || []).length;
  const utf8HasThaiHeader = /วันที่|รายการ|จำนวนเงิน/.test(utf8);

  let tis620 = '';
  let tisScore = 9999;
  try {
    tis620 = new TextDecoder('windows-874', { fatal: false }).decode(bytes);
    tisScore = (tis620.match(/\uFFFD/g) || []).length;
  } catch {
    // windows-874 not available, fall back to utf8 only
  }
  const tisHasThaiHeader = /วันที่|รายการ|จำนวนเงิน/.test(tis620);

  if ((!utf8HasThaiHeader && tisHasThaiHeader) || tisScore < utf8Score) {
    return { content: tis620, encoding: 'TIS-620 / Windows-874' };
  }
  return { content: utf8, encoding: 'UTF-8' };
}

function normalizeTransaction(row, rowNumber) {
  const title = String(getValue(row, 'title') || '').trim();
  const detail = String(getValue(row, 'detail') || '').trim();
  const fullTitle = [title, detail].filter(Boolean).join(' - ');
  const { amount, hasAmount } = getRowAmount(row);
  const date = parseDate(getValue(row, 'date'));

  if (!hasAmount || (!fullTitle && !amount)) return null;

  return {
    rowNumber,
    date,
    title: fullTitle || 'ไม่ระบุรายละเอียด',
    amount,
    amountSatang: Math.round(amount * 100),
  };
}

function detectBank(fileName, headers, evidence = '') {
  const text = `${fileName} ${headers.join(' ')} ${evidence}`.toLowerCase();
  if (/kbank|k-deposit|k plus|kasikorn|กสิกร/.test(text)) return 'KBank';
  if (/scb|ไทยพาณิชย์/.test(text)) return 'SCB';
  if (/ktc/.test(text)) return 'KTC';
  if (/bbl|bangkok|กรุงเทพ/.test(text)) return 'Bangkok Bank';
  if (/krungsri|bay|กรุงศรี/.test(text)) return 'Krungsri';
  return 'อัตโนมัติ';
}

async function parseCsvFile(file, fileName) {
  const decoded = await decodeCsvFile(file);
  const result = Papa.parse(decoded.content, {
    header: false,
    skipEmptyLines: true,
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(`อ่าน CSV ไม่สำเร็จ: ${result.errors[0].message}`);
  }

  const rows = result.data.map((row) => row.map(cellToValue));
  const headerIndex = findHeaderIndex(rows);
  if (headerIndex < 0) {
    throw new Error('ไม่พบ header วันที่/รายละเอียด/จำนวนเงินใน CSV');
  }

  const headers = rows[headerIndex].map((header) => String(header || '').trim());
  const transactions = rows
    .slice(headerIndex + 1)
    .map((row, index) => {
      const obj = {};
      headers.forEach((header, columnIndex) => {
        if (!header) return;
        obj[header] = row[columnIndex];
      });
      return normalizeTransaction(obj, headerIndex + index + 2);
    })
    .filter(Boolean);

  return {
    transactions,
    encoding: decoded.encoding,
    detectedBank: detectBank(fileName, headers, decoded.content.slice(0, 2000)),
  };
}

function cellToValue(cell) {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date || typeof cell === 'number') return cell;
  if (typeof cell === 'object') {
    if (cell.text) return cell.text;
    if (cell.result !== undefined) return cell.result;
    if (cell.richText) return cell.richText.map((part) => part.text).join('');
  }
  return String(cell).trim();
}

function findHeaderIndex(rows) {
  return rows.findIndex((row) => {
    const hasDate = row.some((cell) => headerMatches(cell, FIELD_ALIASES.date));
    const hasTitle = row.some((cell) => (
      headerMatches(cell, FIELD_ALIASES.title) || headerMatches(cell, FIELD_ALIASES.detail)
    ));
    const hasAmount = row.some((cell) => (
      headerMatches(cell, FIELD_ALIASES.amount) ||
      headerMatches(cell, FIELD_ALIASES.debit) ||
      headerMatches(cell, FIELD_ALIASES.credit)
    ));
    return hasDate && hasTitle && hasAmount;
  });
}

async function parseExcelFile(file, fileName) {
  const rows = (await readXlsxFile(file)).map((row) => row.map(cellToValue));

  const headerIndex = findHeaderIndex(rows);
  if (headerIndex < 0) {
    throw new Error('ไม่พบ header วันที่/รายละเอียด/จำนวนเงินใน Excel');
  }

  const headers = rows[headerIndex].map((header) => String(header || '').trim());
  const transactions = rows
    .slice(headerIndex + 1)
    .map((row, index) => {
      const obj = {};
      headers.forEach((header, columnIndex) => {
        obj[header] = row[columnIndex];
      });
      return normalizeTransaction(obj, headerIndex + index + 2);
    })
    .filter(Boolean);

  return {
    transactions,
    encoding: 'Excel XLSX',
    detectedBank: detectBank(fileName, headers, rows.slice(0, 8).flat().join(' ')),
  };
}

async function parseStatementFile(file) {
  if (!file || !(file instanceof File)) {
    throw new Error('กรุณาเลือกไฟล์ CSV หรือ XLSX');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('ไฟล์มีขนาดใหญ่เกิน 20MB');
  }

  const name = file.name || 'statement';
  const ext = (name.split('.').pop() || '').toLowerCase();
  const extension = `.${ext}`;

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error('รองรับเฉพาะไฟล์ .csv และ .xlsx');
  }

  const parsed = extension === '.csv'
    ? await parseCsvFile(file, name)
    : await parseExcelFile(file, name);

  return {
    ...parsed,
    fileName: name,
    count: parsed.transactions.length,
  };
}

export {
  parseAmount,
  parseDate,
  parseStatementFile,
};
