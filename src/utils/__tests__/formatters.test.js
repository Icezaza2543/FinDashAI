import { describe, it, expect } from 'vitest';
import { formatMoney, formatPlain, scaleMoney } from '../formatters';

describe('formatters', () => {
  describe('formatMoney', () => {
    it('formats positive numbers correctly with THB currency', () => {
      expect(formatMoney(1000)).toMatch(/1,000/);
      expect(formatMoney(1000)).toMatch(/\u0E3F/); // Thai Baht symbol ฿
    });

    it('formats negative numbers correctly', () => {
      expect(formatMoney(-500)).toMatch(/-.*500/);
    });

    it('rounds to zero decimal places', () => {
      expect(formatMoney(100.5)).toMatch(/101/);
    });
  });

  describe('formatPlain', () => {
    it('formats numbers with commas', () => {
      expect(formatPlain(1000000)).toBe('1,000,000');
    });

    it('formats numbers with maximum 1 decimal place', () => {
      expect(formatPlain(10.56)).toBe('10.6');
    });
  });

  describe('scaleMoney', () => {
    it('scales and rounds the money value correctly', () => {
      expect(scaleMoney(100, 1.5)).toBe(150);
      expect(scaleMoney(100.2, 0.5)).toBe(50);
    });
  });
});
