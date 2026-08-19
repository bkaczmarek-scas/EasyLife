const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isNonEmptyString,
  isFiniteNumber,
  isDateString,
  isMonth,
  isYear,
  isVin,
  isPdfBase64
} = require('../src/validation');

test('validates non-empty strings', () => {
  assert.equal(isNonEmptyString('EasyLife'), true);
  assert.equal(isNonEmptyString('   '), false);
  assert.equal(isNonEmptyString(null), false);
});

test('validates finite numeric ranges', () => {
  assert.equal(isFiniteNumber('123', { min: 0 }), true);
  assert.equal(isFiniteNumber('abc', { min: 0 }), false);
  assert.equal(isFiniteNumber(-1, { min: 0 }), false);
  assert.equal(isFiniteNumber(Infinity), false);
});

test('validates calendar dates and periods', () => {
  assert.equal(isDateString('2026-08-19'), true);
  assert.equal(isDateString('2026-02-30'), false);
  assert.equal(isDateString('19-08-2026'), false);
  assert.equal(isMonth(8), true);
  assert.equal(isMonth(13), false);
  assert.equal(isYear(2026), true);
  assert.equal(isYear(1999), false);
});

test('validates VINs', () => {
  assert.equal(isVin('1HGCM82633A004352'), true);
  assert.equal(isVin('1HGCM82633A00435I'), false);
  assert.equal(isVin('123'), false);
  assert.equal(isVin(null), true);
});

test('requires a real PDF header for PDF uploads', () => {
  const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from('demo')]).toString('base64');
  const fakePdf = Buffer.from('not really a pdf').toString('base64');
  assert.equal(isPdfBase64(pdf), true);
  assert.equal(isPdfBase64(fakePdf), false);
  assert.equal(isPdfBase64('not-base64'), false);
});
