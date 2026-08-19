function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isFiniteNumber(value, { min = -Infinity, max = Infinity } = {}) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

function isDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isMonth(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 12;
}

function isYear(value) {
  return Number.isInteger(Number(value)) && Number(value) >= 2000 && Number(value) <= 2100;
}

function isVin(value) {
  return value == null || value === '' || (typeof value === 'string' && /^[A-HJ-NPR-Z0-9]{17}$/i.test(value));
}

function isPdfBase64(value) {
  if (typeof value !== 'string' || !value) return false;
  try {
    const bytes = Buffer.from(value, 'base64');
    return bytes.length > 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-';
  } catch {
    return false;
  }
}

module.exports = {
  isNonEmptyString,
  isFiniteNumber,
  isDateString,
  isMonth,
  isYear,
  isVin,
  isPdfBase64
};
