class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

function requiredString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} is required`);
  }
  return value.trim();
}

function optionalString(value, field, maxLength = 500) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  const result = value.trim();
  if (result.length > maxLength) throw new ValidationError(`${field} is too long`);
  return result;
}

function number(value, field, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = {}) {
  const result = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new ValidationError(`${field} must be a number`);
  }
  if (integer && !Number.isInteger(result)) {
    throw new ValidationError(`${field} must be an integer`);
  }
  if (result < min || result > max) {
    throw new ValidationError(`${field} is out of range`);
  }
  return result;
}

function date(value, field, { optional = true } = {}) {
  if (value == null || value === '') {
    if (optional) return null;
    throw new ValidationError(`${field} is required`);
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${field} must use YYYY-MM-DD format`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`${field} is not a valid date`);
  }
  return value;
}

function email(value) {
  requiredString(value, 'email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new ValidationError('email is invalid');
  }
  return value.trim();
}

function month(value) {
  return number(value, 'month', { min: 1, max: 12, integer: true });
}

function year(value) {
  return number(value, 'year', { min: 2000, max: 2100, integer: true });
}

function pdfBase64(value, field = 'base64') {
  const source = requiredString(value, field);
  const raw = source.replace(/^data:application\/pdf;base64,/i, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw) || raw.length % 4 !== 0) {
    throw new ValidationError(`${field} is not valid base64`);
  }
  const bytes = Buffer.from(raw, 'base64');
  if (bytes.length < 5 || bytes.subarray(0, 5).toString() !== '%PDF-') {
    throw new ValidationError(`${field} is not a valid PDF`);
  }
  if (bytes.length > 10 * 1024 * 1024) {
    throw new ValidationError(`${field} exceeds the 10 MB limit`);
  }
  return raw;
}

function runtimeConfig(env = process.env) {
  if (env.NODE_ENV === 'production') {
    if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
      throw new Error('SESSION_SECRET must be set and contain at least 32 characters in production');
    }
  }
}

module.exports = {
  ValidationError,
  requiredString,
  optionalString,
  number,
  date,
  email,
  month,
  year,
  pdfBase64,
  runtimeConfig
};
