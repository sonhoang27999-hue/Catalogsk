import { expect, test } from 'bun:test';
import { dealerCodeFromSearch, dealerLink, formatPhone, isDealerCode, normalizeDealerCode, telHref, zaloHref } from './dealerLink';

test('normalizes typed shop names into link codes', () => {
  expect(normalizeDealerCode('  Asia Car  ')).toBe('asia-car');
  expect(normalizeDealerCode('Đại Lý Minh_Auto.01')).toBe('dai-ly-minh-auto-01');
  expect(normalizeDealerCode('--a--')).toBe('a');
  expect(normalizeDealerCode(null)).toBe('');
  expect(normalizeDealerCode('x'.repeat(40))).toHaveLength(30);
});

test('accepts only safe codes', () => {
  expect(isDealerCode('asia-car')).toBe(true);
  expect(isDealerCode('abc')).toBe(true);
  expect(isDealerCode('ab')).toBe(false);
  expect(isDealerCode('1abc')).toBe(false);
  expect(isDealerCode('abc-')).toBe(false);
  expect(isDealerCode('Asia')).toBe(false);
  expect(isDealerCode('true')).toBe(false);
  expect(isDealerCode('off')).toBe(false);
  expect(isDealerCode('a'.repeat(31))).toBe(false);
  expect(isDealerCode(123)).toBe(false);
});

test('reads the dealer code from a URL query', () => {
  expect(dealerCodeFromSearch('?dl=asia-car')).toBe('asia-car');
  expect(dealerCodeFromSearch('?v=2&dl=Asia-Car')).toBe('asia-car');
  expect(dealerCodeFromSearch('?dl=off')).toBe('off');
  expect(dealerCodeFromSearch('?dl=<script>')).toBe(null);
  expect(dealerCodeFromSearch('?v=2')).toBe(null);
  expect(dealerCodeFromSearch('')).toBe(null);
});

test('builds links and phone targets', () => {
  expect(dealerLink('https://catalog.sklight.vn/', 'asia-car')).toBe('https://catalog.sklight.vn/d/asia-car');
  expect(telHref('0912 345 678')).toBe('tel:0912345678');
  expect(telHref('+84 912 345 678')).toBe('tel:+84912345678');
  expect(zaloHref('0912.345.678')).toBe('https://zalo.me/0912345678');
  expect(formatPhone('0912345678')).toBe('0912 345 678');
  expect(formatPhone('+84912345678')).toBe('+84912345678');
});
