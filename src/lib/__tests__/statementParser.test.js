import { describe, it, expect, beforeAll } from 'vitest';
import { parseAmount, parseDate } from '../statementParser';

describe('statementParser', () => {
  describe('parseAmount', () => {
    it('parses normal positive numbers', () => {
      expect(parseAmount('100')).toBe(100);
      expect(parseAmount('1,500.50')).toBe(1500.5);
    });

    it('parses negative numbers with minus sign', () => {
      expect(parseAmount('-50')).toBe(-50);
      expect(parseAmount('-1,234.56')).toBe(-1234.56);
      expect(parseAmount('100-')).toBe(-100);
    });

    it('parses negative numbers with parentheses', () => {
      expect(parseAmount('(500)')).toBe(-500);
      expect(parseAmount('(1,000.99)')).toBe(-1000.99);
    });

    it('handles invalid inputs gracefully', () => {
      expect(parseAmount(null)).toBe(0);
      expect(parseAmount(undefined)).toBe(0);
      expect(parseAmount('')).toBe(0);
      expect(parseAmount('abc')).toBe(0);
    });

    it('handles extreme numerical values gracefully', () => {
      expect(parseAmount('999,999,999,999.99')).toBe(999999999999.99);
      expect(parseAmount(Number.MAX_SAFE_INTEGER)).toBe(9007199254740991);
      expect(parseAmount(Infinity)).toBe(0); // If Number.isFinite is checked
      expect(parseAmount(NaN)).toBe(0);
    });
  });

  describe('parseDate', () => {
    it('parses standard ISO dates', () => {
      expect(parseDate('2024-05-30')).toBe('2024-05-30');
      expect(parseDate('2024/05/30')).toBe('2024-05-30');
    });

    it('parses Thai short Buddhist year formats (DD/MM/YY)', () => {
      // 30/05/67 -> 2024-05-30
      expect(parseDate('30/05/67')).toBe('2024-05-30');
      expect(parseDate('1/5/67')).toBe('2024-05-01');
    });

    it('parses Thai textual month formats', () => {
      // 30 พ.ค. 2567 -> 2024-05-30
      expect(parseDate('30 พ.ค. 2567')).toBe('2024-05-30');
      expect(parseDate('30 พ.ค. 67')).toBe('2024-05-30');
    });

    it('handles invalid inputs gracefully', () => {
      expect(parseDate('')).toBe('');
      expect(parseDate(null)).toBe('');
    });
  });

  describe('parseStatementFile error boundaries', () => {
    // dynamic import required for parseStatementFile
    let parseStatementFile;
    beforeAll(async () => {
      const parser = await import('../statementParser');
      parseStatementFile = parser.parseStatementFile;
    });

    it('throws error on invalid file type (null or non-file)', async () => {
      await expect(parseStatementFile(null)).rejects.toThrow('กรุณาเลือกไฟล์ CSV หรือ XLSX');
      await expect(parseStatementFile({})).rejects.toThrow('กรุณาเลือกไฟล์ CSV หรือ XLSX');
    });

    it('throws error on unsupported extension', async () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      await expect(parseStatementFile(file)).rejects.toThrow('รองรับเฉพาะไฟล์ .csv และ .xlsx');
    });

    it('throws error on file exceeding 20MB limit', async () => {
      // Create a mock file with an overridden size property to avoid allocating 21MB in memory
      const file = new File([''], 'large.csv', { type: 'text/csv' });
      Object.defineProperty(file, 'size', { value: 21 * 1024 * 1024 });
      await expect(parseStatementFile(file)).rejects.toThrow('ไฟล์มีขนาดใหญ่เกิน 20MB');
    });

    it('successfully parses a valid CSV with standard headers', async () => {
      const csvContent = 'วันที่,รายการ,จำนวนเงิน\n2024-05-30,Salary,50000\n2024-05-31,Coffee,-150';
      const file = new File([csvContent], 'statement.csv', { type: 'text/csv' });
      const result = await parseStatementFile(file);
      expect(result.count).toBe(2);
      expect(result.transactions[0].amount).toBe(50000);
      expect(result.transactions[1].amount).toBe(-150);
      expect(result.transactions[0].date).toBe('2024-05-30');
    });

    it('throws error when CSV has no valid headers', async () => {
      const csvContent = 'A,B,C\n1,2,3';
      const file = new File([csvContent], 'invalid.csv', { type: 'text/csv' });
      await expect(parseStatementFile(file)).rejects.toThrow('ไม่พบ header วันที่/รายละเอียด/จำนวนเงินใน CSV');
    });

    it('handles debit and credit columns correctly', async () => {
      const csvContent = 'date,title,debit,credit\n2024-05-30,Salary,,50000\n2024-05-31,Coffee,150,';
      const file = new File([csvContent], 'split.csv', { type: 'text/csv' });
      const result = await parseStatementFile(file);
      expect(result.count).toBe(2);
      expect(result.transactions[0].amount).toBe(50000);
      expect(result.transactions[1].amount).toBe(-150);
    });
  });
});
