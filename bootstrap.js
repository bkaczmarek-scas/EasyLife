require('dotenv').config();

const Module = require('module');
const expressSession = require('express-session');
const FileSessionStore = require('./src/session/FileSessionStore');
const {
  ValidationError,
  string,
  number,
  date,
  month,
  year,
  email,
  pdfBase64,
  runtimeConfig
} = require('./src/services/validation');

runtimeConfig();

function validateBody(req) {
  const { method, path: requestPath } = req;
  const body = req.body || {};

  if (method === 'POST' && requestPath === '/api/login') {
    email(body.email);
    if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 200) {
      throw new ValidationError('password is invalid');
    }
    return;
  }

  if (method === 'POST' && requestPath === '/api/protocols/generate') {
    month(body.month); year(body.year);
    if (!Array.isArray(body.projects)) throw new ValidationError('projects must be an array');
    number(body.totalHours, 'totalHours', { min: 0 });
    return;
  }

  if (method === 'POST' && requestPath === '/api/protocols/history/upload') {
    month(body.month); year(body.year);
    const filename = string(body.filename, 'filename');
    if (!/\.pdf$/i.test(filename)) throw new ValidationError('filename must end with .pdf');
    pdfBase64(body.base64);
    return;
  }

  if ((method === 'POST' || method === 'PUT') && /^\/api\/bonuses(?:\/[^/]+)?$/.test(requestPath)) {
    string(body.name, 'name'); date(body.date, 'date', { required: true }); number(body.amount, 'amount', { min: 0 }); return;
  }

  if ((method === 'POST' || method === 'PUT') && /^\/api\/rates(?:\/[^/]+)?$/.test(requestPath)) {
    string(body.from, 'from'); number(body.rate, 'rate', { min: 0 }); return;
  }

  if (method === 'PUT' && /^\/api\/costs\/[^/]+$/.test(requestPath)) {
    number(body.zus ?? 0, 'zus', { min: 0 }); number(body.tax ?? 0, 'tax', { min: 0 }); number(body.accounting ?? 0, 'accounting', { min: 0 }); return;
  }

  if ((method === 'POST' || method === 'PUT') && /^\/api\/vehicles(?:\/[^/]+)?$/.test(requestPath)) {
    string(body.name, 'name'); number(body.mileage ?? 0, 'mileage', { min: 0 });
    date(body.nextServiceDate, 'nextServiceDate'); date(body.insuranceExpiryDate, 'insuranceExpiryDate'); return;
  }

  if (method === 'PUT' && /^\/api\/vehicles\/[^/]+\/mileage$/.test(requestPath)) {
    number(body.mileage, 'mileage', { min: 0 }); return;
  }

  if (method === 'POST' && requestPath === '/api/service-log') {
    string(body.vehicleId, 'vehicleId'); string(body.type, 'type'); date(body.date, 'date', { required: true });
    number(body.cost ?? 0, 'cost', { min: 0 });
    if (body.mileage != null && body.mileage !== '') number(body.mileage, 'mileage', { min: 0 });
    return;
  }

  if ((method === 'POST' || method === 'PUT') && /^\/api\/properties(?:\/[^/]+)?$/.test(requestPath)) {
    string(body.name, 'name'); string(body.address, 'address'); date(body.maintenanceDate, 'maintenanceDate'); return;
  }

  if (method === 'POST' && /^\/api\/properties\/[^/]+\/comments$/.test(requestPath)) {
    string(body.text, 'text', { max: 2000 }); return;
  }

  if ((method === 'POST' || method === 'PUT') && /^\/api\/subscriptions(?:\/[^/]+)?$/.test(requestPath)) {
    string(body.name, 'name'); number(body.cost ?? 0, 'cost', { min: 0 });
    date(body.nextRenewalDate, 'nextRenewalDate'); date(body.lastUsedDate, 'lastUsedDate'); return;
  }

  if ((method === 'POST' || method === 'PUT') && /^\/api\/chores(?:\/[^/]+)?$/.test(requestPath)) {
    string(body.name, 'name');
    if (body.frequency != null && !['daily', 'weekly', 'monthly'].includes(body.frequency)) throw new ValidationError('frequency is invalid');
    return;
  }
}

function requestValidation(req, res, next) {
  try {
    validateBody(req);
    next();
  } catch (error) {
    if (error instanceof ValidationError) return res.status(400).json({ error: error.message });
    next(error);
  }
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'express-session') {
    const wrapped = function wrappedSession(options = {}) {
      const configuredSecret = options.secret || process.env.SESSION_SECRET;
      if (!configuredSecret) throw new Error('SESSION_SECRET must be configured');
      return expressSession({
        store: options.store || new FileSessionStore(),
        ...options,
        secret: configuredSecret
      });
    };
    Object.assign(wrapped, expressSession);
    return wrapped;
  }

  if (request === 'express') {
    const realExpress = originalLoad(request, parent, isMain);
    const patchedExpress = function patchedExpress(...args) {
      const app = realExpress(...args);
      const originalUse = app.use.bind(app);
      let validationInjected = false;
      app.use = function patchedUse(...middleware) {
        const result = originalUse(...middleware);
        const candidate = middleware[0];
        if (!validationInjected && candidate && candidate.name === 'jsonParser') {
          originalUse(requestValidation);
          validationInjected = true;
        }
        return result;
      };
      return app;
    };
    Object.assign(patchedExpress, realExpress);
    return patchedExpress;
  }

  return originalLoad(request, parent, isMain);
};
