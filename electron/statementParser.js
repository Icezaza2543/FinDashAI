const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const Papa = require('papaparse');
const readXlsxFile = require('read-excel-file/node');

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set(['.csv', '.xlsx']);

const THAI_MONTHS = {
  'ม.ค.': 1,
  'มกราคม': 1,
  'ก.พ.': 2,
  'กุมภาพันธ์': 2,
  'มี.ค.': 3,
  'มีนาคม': 3,
  'เม.ย.': 4,
  'เมษายน': 4,
  'พ.ค.': 5,
  'พฤษภาคม': 5,
  'มิ.ย.': 6,
  'มิถุนายน': 6,
  'ก.ค.': 7,
  'กรกฎาคม': 7,
  'ส.ค.': 8,
  'สิงหาคม': 8,
  'ก.ย.': 9,
  'กันยายน': 9,
  'ต.ค.': 10,
  'ตุลาคม': 10,
  'พ.ย.': 11,
  'พฤศจิกายน': 11,
  'ธ.ค.': 12,
  'ธันวาคม': 12,
};

const FIELD_ALIASES = {
  date: ['date', 'transactiondate', 'postingdate', 'valuedate', 'วันที่', 'วันที่ทำรายการ', 'วันเดือนปี'],
  title: ['description', 'detail', 'details', 'memo', 'title', 'รายการ', 'รายละเอียด', 'คำอธิบาย'],
  amount: ['amount', 'transactionamount', 'จำนวนเงิน', 'ยอดเงิน', 'จำนวน'],
  debit: ['debit', 'withdrawal', 'withdraw', 'paidout', 'ถอน', 'เงินออก', 'เดบิต', 'จ่าย'],
  credit: ['credit', 'deposit', 'paidin', 'ฝาก', 'เงินเข้า', 'เครดิต', 'รับ'],
};

function validateStatementFile(filePath) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('ไม่พบ path ของไฟล์ statement');
  }

  const resolvedPath = path.resolve(filePath);
  const extension = path.extname(resolvedPath).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error('รองรับเฉพาะไฟล์ .csv และ .xlsx เพื่อความปลอดภัยในการอ่านไฟล์');
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isFile()) {
    throw new Error('ไฟล์ที่เลือกไม่ใช่ไฟล์ statement');
  }
  if (stat.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('ไฟล์มีขนาดใหญ่เกิน 20MB');
  }

  return { extension, fileName: path.basename(resolvedPath), filePath: resolvedPath };
}

function normalizeHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_./:()[\]-]+/g, '');
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

function parseAmount(value) {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const raw = String(value).trim();
  const negative = /^\(.*\)$/.test(raw) || /-$/.test(raw);
  const normalized = raw.replace(/,/g, '').replace(/[^\d.-]/g, '');
  const amount = Number.parseFloat(normalized);

  if (!Number.isFinite(amount)) {
    return 0;
  }

  return negative ? -Math.abs(amount) : amount;
}

function getRowAmount(row) {
  const amountValue = getValue(row, 'amount');
  if (amountValue !== undefined && amountValue !== '') {
    return parseAmount(amountValue);
  }

  const credit = Math.abs(parseAmount(getValue(row, 'credit')));
  const debit = Math.abs(parseAmount(getValue(row, 'debit')));
  return credit - debit;
}

function toIsoDate(year, month, day) {
  const normalizedYear = year > 2400 ? year - 543 : year;
  if (!normalizedYear || !month || !day) {
    return '';
  }

  return `${String(normalizedYear).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseDate(value) {
  if (!value) {
    return '';
  }

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

  match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (match) {
    const rawYear = Number(match[3]);
    const year = rawYear < 100 ? rawYear + 2000 : rawYear;
    return toIsoDate(year, Number(match[2]), Number(match[1]));
  }

  match = text.match(/^(\d{1,2})\s+([^\s]+)\s+(\d{2,4})$/);
  if (match) {
    const month = THAI_MONTHS[match[2]];
    const rawYear = Number(match[3]);
    const year = rawYear < 100 ? rawYear + 2500 : rawYear;
    return toIsoDate(year, month, Number(match[1]));
  }

  return text;
}

function decodeCsv(buffer) {
  const utf8 = buffer.toString('utf8');
  const tis620 = iconv.decode(buffer, 'tis-620');
  const utf8Score = (utf8.match(/\uFFFD/g) || []).length;
  const tisScore = (tis620.match(/\uFFFD/g) || []).length;
  const utf8HasThaiHeader = /วันที่|รายการ|จำนวนเงิน/.test(utf8);
  const tisHasThaiHeader = /วันที่|รายการ|จำนวนเงิน/.test(tis620);

  if ((!utf8HasThaiHeader && tisHasThaiHeader) || tisScore < utf8Score) {
    return { content: tis620, encoding: 'TIS-620 / Windows-874' };
  }

  return { content: utf8, encoding: 'UTF-8' };
}

function normalizeTransaction(row, rowNumber) {
  const title = String(getValue(row, 'title') || '').trim();
  const amount = getRowAmount(row);
  const date = parseDate(getValue(row, 'date'));

  if (!title && !amount) {
    return null;
  }

  return {
    rowNumber,
    date,
    title: title || 'ไม่ระบุรายละเอียด',
    amount,
    amountSatang: Math.round(amount * 100),
  };
}

function detectBank(fileName, headers) {
  const text = `${fileName} ${headers.join(' ')}`.toLowerCase();
  if (/scb|ไทยพาณิชย์/.test(text)) return 'SCB';
  if (/kbank|kasikorn|กสิกร/.test(text)) return 'KBank';
  if (/ktc/.test(text)) return 'KTC';
  if (/bbl|bangkok|กรุงเทพ/.test(text)) return 'Bangkok Bank';
  if (/krungsri|bay|กรุงศรี/.test(text)) return 'Krungsri';
  return 'อัตโนมัติ';
}

function parseCsv(filePath, fileName) {
  const buffer = fs.readFileSync(filePath);
  const decoded = decodeCsv(buffer);
  const result = Papa.parse(decoded.content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(`อ่าน CSV ไม่สำเร็จ: ${result.errors[0].message}`);
  }

  const headers = result.meta.fields || [];
  const transactions = result.data
    .map((row, index) => normalizeTransaction(row, index + 2))
    .filter(Boolean);

  return {
    transactions,
    encoding: decoded.encoding,
    detectedBank: detectBank(fileName, headers),
  };
}

function cellToValue(cell) {
  if (cell === null || cell === undefined) {
    return '';
  }
  if (cell instanceof Date || typeof cell === 'number') {
    return cell;
  }
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
    const hasTitle = row.some((cell) => headerMatches(cell, FIELD_ALIASES.title));
    const hasAmount = row.some((cell) => (
      headerMatches(cell, FIELD_ALIASES.amount)
      || headerMatches(cell, FIELD_ALIASES.debit)
      || headerMatches(cell, FIELD_ALIASES.credit)
    ));
    return hasDate && hasTitle && hasAmount;
  });
}

async function parseExcel(filePath, fileName) {
  const rows = (await readXlsxFile(filePath)).map((row) => row.map(cellToValue));

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
    detectedBank: detectBank(fileName, headers),
  };
}

async function parseStatementFile(inputPath) {
  const file = validateStatementFile(inputPath);
  const parsed = file.extension === '.csv'
    ? parseCsv(file.filePath, file.fileName)
    : await parseExcel(file.filePath, file.fileName);

  return {
    ...parsed,
    filePath: file.filePath,
    fileName: file.fileName,
    count: parsed.transactions.length,
  };
}

module.exports = {
  parseAmount,
  parseDate,
  parseStatementFile,
};
