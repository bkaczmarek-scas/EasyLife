class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

function string(value, field, { required = true, max = 500 } = {}) {
  if (value == null || value === '') {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  const result = value.trim();
  if (required && !result) throw new ValidationError(`${field} is required`);
  if (result.length > max) throw new ValidationError(`${field} is too long`);
  return result;
}

function number(value, field, { min = -Infinity, max = Infinity } = {}) {
  const result = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof result !== 'number' || !Number.isFinite(result)) throw new ValidationError(`${field} must be a number`);
  if (result < min || result > max) throw new ValidationError(`${field} is out of range`);
  return result;
}

function date(value, field, { required = false } = {}) {
  if (value == null || value === '') {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ValidationError(`${field} must use YYYY-MM-DD`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new ValidationError(`${field} is invalid`);
  return value;
}

function month(value) {
  return number(value, 'month', { min: 1, max: 12 });
}

function year(value) {
  return number(value, 'year', { min: 2000, max: 2100 });
}

function email(value) {
  const result = string(value, 'email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new ValidationError('email is invalid');
  return result;
}

function pdfBase64(value) {
  const result = string(value, 'base64', { max: 14 * 1024 * 1024 });
  const bytes = Buffer.from(result, 'base64');
  if (bytes.length < 5 || bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new ValidationError('base64 is not a valid PDF');
  if (bytes.length > 10 * 1024 * 1024) throw new ValidationError('PDF exceeds 10 MB');
  return result;
}

function runtimeConfig(env = process.env) {
  if (env.NODE_ENV === 'production' && (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32)) {
    throw new Error('SESSION_SECRET must be configured and contain at least 32 characters in production');
  }
}

module.exports = { ValidationError, string, number, date, month, year, email, pdfBase64, runtimeConfig };
