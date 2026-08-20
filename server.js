require('dotenv').config();

// DEMO_MODE is a belt-and-suspenders guard for public/demo deployments: even if real secrets
// or contractor PII end up set in the host's env panel by mistake, this neutralizes them at
// boot so a demo deployment can never call real Jira/Tempo or render real contractor data.
if (process.env.DEMO_MODE === 'true') {
  delete process.env.JIRA_API_TOKEN;
  delete process.env.TEMPO_API_TOKEN;
  delete process.env.CONTRACTOR_JIRA_ACCOUNT_ID;
  process.env.CONTRACTOR_NAME = 'Jan Kowalski';
  process.env.CONTRACTOR_ADDRESS = 'ul. Przykładowa 1, 00-000 Warszawa';
  process.env.CONTRACTOR_NIP = '0000000000';
  process.env.CONTRACTOR_ORDER_INITIALS = 'XX';
  process.env.CONTRACTOR_AGREEMENT_DATE = '01.01.2025';
  delete process.env.IFIRMA_USERNAME;
  delete process.env.IFIRMA_INVOICE_KEY;
  delete process.env.IFIRMA_BANK_ACCOUNT;
  process.env.CLIENT_NAME = 'Przykladowa Sp. z o.o.';
  process.env.CLIENT_NIP = '0000000000';
  process.env.CLIENT_ADDRESS_STREET = 'ul. Przykladowa 1';
  process.env.CLIENT_POSTAL_CODE = '00-000';
  process.env.CLIENT_CITY = 'Warszawa';
  process.env.CLIENT_COUNTRY = 'Polska';
  delete process.env.CLIENT_COUNTRY_CODE;
}

const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const tempoService = require('./src/services/tempoService');
const pdfService = require('./src/services/pdfService');
const jiraService = require('./src/services/jiraService');
const bonusesService = require('./src/services/bonusesService');
const authService = require('./src/services/authService');
const ratesService = require('./src/services/ratesService');
const costsService = require('./src/services/costsService');
const protocolsHistoryService = require('./src/services/protocolsHistoryService');
const vehiclesService = require('./src/services/vehiclesService');
const propertiesService = require('./src/services/propertiesService');
const taxPaymentsService = require('./src/services/taxPaymentsService');
const propertyExpensesService = require('./src/services/propertyExpensesService');
const subscriptionsService = require('./src/services/subscriptionsService');
const choresService = require('./src/services/choresService');
const ifirmaService = require('./src/services/ifirmaService');

const app = express();
// Needed for secure cookies to work behind a TLS-terminating reverse proxy (Railway, Render,
// Fly.io etc. all forward plain HTTP internally) - without this express-session can't tell the
// request was actually made over HTTPS and will refuse to set the cookie.
app.set('trust proxy', 1);
// Default CSP assumes external JS/CSS bundles and no inline script/style - this app is a single
// inline-script HTML file by design (see CLAUDE.md), so the policy below allowlists exactly the
// CDNs it actually loads (cdnjs for Tabler icons + Chart.js, Google Fonts) instead of disabling
// CSP outright.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"]
    }
  }
}));
// Default 100kb JSON body limit is too small for base64-encoded PDF uploads (manual invoice
// upload in the History tab) - a few MB of scanned PDF becomes ~33% larger as base64.
app.use(express.json({ limit: '15mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.get('/login', (req, res) => {
  if (req.session.authenticated) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Brute-force guard on login - bcrypt already makes password guessing slow, this stops an
// attacker from just hammering the endpoint over the network.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

app.post('/api/login', loginLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!authService.isConfigured()) {
    return res.status(500).json({ error: 'Login is not set up yet. Run: node scripts/set-password.js' });
  }
  if (!email || !password || !authService.verify(email, password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  req.session.authenticated = true;
  // Decoupled from whatever AUTH_EMAIL is actually configured, so the UI (sidebar name is
  // derived from this) never displays a real identity even if the operator forgets to use a
  // demo-only login email on a public deployment.
  req.session.email = process.env.DEMO_MODE === 'true' ? 'demo@example.com' : email;
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.use((req, res, next) => {
  if (req.session.authenticated) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated' });
  res.redirect('/login');
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/status', (req, res) => {
  res.json({
    jiraConfigured: jiraService.isConfigured(),
    tempoConfigured: Boolean(process.env.TEMPO_API_TOKEN),
    ifirmaConfigured: ifirmaService.isConfigured(),
    email: req.session.email || ''
  });
});

app.get('/api/worklogs', async (req, res) => {
  try {
    const month = parseInt(req.query.month, 10);
    const year = parseInt(req.query.year, 10);
    if (!month || !year) return res.status(400).json({ error: 'Please provide month and year' });
    const worklogs = await tempoService.getWorklogsGrouped(month, year);
    res.json(worklogs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/protocols/generate', async (req, res) => {
  try {
    const { month, year, projects, totalHours, force } = req.body;
    if (!month || !year || !projects || totalHours == null) {
      return res.status(400).json({ error: 'Required: month, year, projects, totalHours' });
    }

    const existing = await protocolsHistoryService.getById(protocolsHistoryService.periodId(month, year));
    if (existing && !force) {
      const when = existing.generatedAt ? new Date(existing.generatedAt).toLocaleDateString() : null;
      return res.status(409).json({
        code: 'ALREADY_GENERATED',
        error: when
          ? `Protocols for this period were already generated on ${when}${existing.exported ? ' and exported' : ''}. Check the History tab, or regenerate to overwrite.`
          : 'A document was already manually uploaded for this period. Check the History tab, or regenerate to add protocols alongside it.',
        entry: existing
      });
    }

    const { data, files } = await pdfService.generateProtocols(month, year, { projects, totalHours });
    const historyEntry = await protocolsHistoryService.recordGenerated(month, year, data, files);
    res.json({
      historyId: historyEntry.id,
      zamowienie: {
        filename: files.zamowienie.filename,
        base64: Buffer.from(files.zamowienie.bytes).toString('base64')
      },
      odbiorczy: {
        filename: files.odbiorczy.filename,
        base64: Buffer.from(files.odbiorczy.bytes).toString('base64')
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/protocols/history', async (req, res) => {
  try {
    res.json({ history: await protocolsHistoryService.getAll() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/protocols/history/:id/download/:kind', async (req, res) => {
  try {
    const { bytes, filename } = await protocolsHistoryService.getFileBytes(req.params.id, req.params.kind);
    res.json({ filename, base64: bytes.toString('base64') });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/protocols/history/:id/mark-exported', async (req, res) => {
  try {
    const entry = await protocolsHistoryService.markExported(req.params.id);
    res.json({ protocol: entry });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/protocols/history/upload', async (req, res) => {
  try {
    const { month, year, filename, base64 } = req.body;
    if (!month || !year || !filename || !base64) {
      return res.status(400).json({ error: 'Required: month, year, filename, base64' });
    }
    if (!/\.pdf$/i.test(filename)) {
      return res.status(400).json({ error: 'Only PDF files are supported' });
    }
    const entry = await protocolsHistoryService.addManualFile(Number(month), Number(year), { filename, base64 });
    res.json({ protocol: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/protocols/history/:id/manual/:fileId/download', async (req, res) => {
  try {
    const { bytes, filename } = await protocolsHistoryService.getManualFileBytes(req.params.id, req.params.fileId);
    res.json({ filename, base64: bytes.toString('base64') });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/protocols/history/:id', async (req, res) => {
  try {
    await protocolsHistoryService.removeEntry(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

// :target is 'zamowienie', 'odbiorczy', or a manual file's id.
app.delete('/api/protocols/history/:id/file/:target', async (req, res) => {
  try {
    await protocolsHistoryService.removeFile(req.params.id, req.params.target);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.get('/api/bonuses', async (req, res) => {
  try {
    res.json({ bonuses: await bonusesService.getAll() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bonuses', async (req, res) => {
  try {
    const { name, date, amount } = req.body;
    if (!name || !date || amount == null) {
      return res.status(400).json({ error: 'Required: name, date, amount' });
    }
    const entry = await bonusesService.add({ name, date, amount: Number(amount) });
    res.json({ bonus: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bonuses/:id', async (req, res) => {
  try {
    const { name, date, amount } = req.body;
    if (!name || !date || amount == null) {
      return res.status(400).json({ error: 'Required: name, date, amount' });
    }
    const entry = await bonusesService.update(req.params.id, { name, date, amount: Number(amount) });
    res.json({ bonus: entry });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/bonuses/:id', async (req, res) => {
  try {
    await bonusesService.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.get('/api/rates', async (req, res) => {
  try {
    res.json({ history: await ratesService.getAll() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rates', async (req, res) => {
  try {
    const { from, rate } = req.body;
    if (!from || rate == null) {
      return res.status(400).json({ error: 'Required: from, rate' });
    }
    const entry = await ratesService.add({ from, rate: Number(rate) });
    res.json({ rate: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/rates/:id', async (req, res) => {
  try {
    const { from, rate } = req.body;
    if (!from || rate == null) {
      return res.status(400).json({ error: 'Required: from, rate' });
    }
    const entry = await ratesService.update(req.params.id, { from, rate: Number(rate) });
    res.json({ rate: entry });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/rates/:id', async (req, res) => {
  try {
    await ratesService.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(err.message.includes('At least one') ? 400 : 404).json({ error: err.message });
  }
});

app.get('/api/costs', async (req, res) => {
  try {
    res.json({ costs: await costsService.getAll() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/costs/:month', async (req, res) => {
  try {
    const { zus, tax, accounting } = req.body;
    const entry = await costsService.upsert(req.params.month, { zus, tax, accounting });
    res.json({ cost: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vehicles', async (req, res) => {
  try {
    res.json({ vehicles: await vehiclesService.getVehicles() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vehicles', async (req, res) => {
  try {
    const { name, type, year, engine, fuelType, power, plate, vin, mileage, nextServiceDate, insuranceExpiryDate } = req.body;
    if (!name) return res.status(400).json({ error: 'Required: name' });
    const entry = await vehiclesService.addVehicle({ name, type, year, engine, fuelType, power, plate, vin, mileage, nextServiceDate, insuranceExpiryDate });
    res.json({ vehicle: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/vehicles/:id', async (req, res) => {
  try {
    const { name, type, year, engine, fuelType, power, plate, vin, mileage, nextServiceDate, insuranceExpiryDate } = req.body;
    if (!name) return res.status(400).json({ error: 'Required: name' });
    const entry = await vehiclesService.updateVehicle(req.params.id, { name, type, year, engine, fuelType, power, plate, vin, mileage, nextServiceDate, insuranceExpiryDate });
    res.json({ vehicle: entry });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.put('/api/vehicles/:id/mileage', async (req, res) => {
  try {
    const { mileage } = req.body;
    if (mileage == null || mileage === '') return res.status(400).json({ error: 'Required: mileage' });
    const entry = await vehiclesService.updateMileage(req.params.id, mileage);
    res.json({ vehicle: entry });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/vehicles/:id', async (req, res) => {
  try {
    await vehiclesService.removeVehicle(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.get('/api/service-log', async (req, res) => {
  try {
    res.json({ entries: await vehiclesService.getServiceLog(req.query.vehicleId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/service-log', async (req, res) => {
  try {
    const { vehicleId, date, workshop, description, cost, mileage } = req.body;
    if (!vehicleId || !date) return res.status(400).json({ error: 'Required: vehicleId, date' });
    const entry = await vehiclesService.addServiceEntry({ vehicleId, date, workshop, description, cost, mileage });
    res.json({ entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/service-log/:id', async (req, res) => {
  try {
    await vehiclesService.removeServiceEntry(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.get('/api/properties', async (req, res) => {
  try {
    res.json({ properties: await propertiesService.getAll() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/properties', async (req, res) => {
  try {
    const { name, type, address, tenant, maintenanceNote, maintenanceDate } = req.body;
    if (!name || !address) return res.status(400).json({ error: 'Required: name, address' });
    const entry = await propertiesService.add({ name, type, address, tenant, maintenanceNote, maintenanceDate });
    res.json({ property: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/properties/:id', async (req, res) => {
  try {
    const { name, type, address, tenant, maintenanceNote, maintenanceDate } = req.body;
    if (!name || !address) return res.status(400).json({ error: 'Required: name, address' });
    const entry = await propertiesService.update(req.params.id, { name, type, address, tenant, maintenanceNote, maintenanceDate });
    res.json({ property: entry });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/properties/:id', async (req, res) => {
  try {
    await propertiesService.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/properties/:id/comments', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Required: text' });
    const property = await propertiesService.addComment(req.params.id, text.trim());
    res.json({ property });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/properties/:id/comments/:commentId', async (req, res) => {
  try {
    const property = await propertiesService.removeComment(req.params.id, req.params.commentId);
    res.json({ property });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.put('/api/properties/:id/comments/:commentId/resolve', async (req, res) => {
  try {
    const property = await propertiesService.toggleCommentResolved(req.params.id, req.params.commentId);
    res.json({ property });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.get('/api/tax-payments', async (req, res) => {
  try {
    res.json({ payments: await taxPaymentsService.getAll() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tax-payments', async (req, res) => {
  try {
    const { period, amount, sienkiewicza, szczesliwa, sienkiewiczaNote, szczesliwaNote, transferDate } = req.body;
    if (!period) return res.status(400).json({ error: 'Required: period' });
    const entry = await taxPaymentsService.add({ period, amount, sienkiewicza, szczesliwa, sienkiewiczaNote, szczesliwaNote, transferDate });
    res.json({ payment: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/tax-payments/:id', async (req, res) => {
  try {
    const { period, amount, sienkiewicza, szczesliwa, sienkiewiczaNote, szczesliwaNote, transferDate } = req.body;
    if (!period) return res.status(400).json({ error: 'Required: period' });
    const entry = await taxPaymentsService.update(req.params.id, { period, amount, sienkiewicza, szczesliwa, sienkiewiczaNote, szczesliwaNote, transferDate });
    res.json({ payment: entry });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/tax-payments/:id', async (req, res) => {
  try {
    await taxPaymentsService.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.get('/api/property-expenses', async (req, res) => {
  try {
    res.json({ expenses: await propertyExpensesService.getAll(req.query.propertyId) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/property-expenses', async (req, res) => {
  try {
    const { propertyId, date, description, amount } = req.body;
    if (!propertyId || !date) return res.status(400).json({ error: 'Required: propertyId, date' });
    const entry = await propertyExpensesService.add({ propertyId, date, description, amount });
    res.json({ expense: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/property-expenses/:id', async (req, res) => {
  try {
    const { date, description, amount } = req.body;
    if (!date) return res.status(400).json({ error: 'Required: date' });
    const entry = await propertyExpensesService.update(req.params.id, { date, description, amount });
    res.json({ expense: entry });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/property-expenses/:id', async (req, res) => {
  try {
    await propertyExpensesService.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.get('/api/subscriptions', async (req, res) => {
  try {
    res.json({ subscriptions: await subscriptionsService.getAll() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subscriptions', async (req, res) => {
  try {
    const { name, category, cost, billingCycle, nextRenewalDate, autoRenew, lastUsedDate } = req.body;
    if (!name) return res.status(400).json({ error: 'Required: name' });
    const entry = await subscriptionsService.add({ name, category, cost, billingCycle, nextRenewalDate, autoRenew, lastUsedDate });
    res.json({ subscription: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/subscriptions/:id', async (req, res) => {
  try {
    const { name, category, cost, billingCycle, nextRenewalDate, autoRenew, lastUsedDate } = req.body;
    if (!name) return res.status(400).json({ error: 'Required: name' });
    const entry = await subscriptionsService.update(req.params.id, { name, category, cost, billingCycle, nextRenewalDate, autoRenew, lastUsedDate });
    res.json({ subscription: entry });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/subscriptions/:id', async (req, res) => {
  try {
    await subscriptionsService.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.get('/api/chores', async (req, res) => {
  try {
    res.json({ chores: await choresService.getAll() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chores', async (req, res) => {
  try {
    const { name, frequency, notes, priority, propertyId, vehicleId } = req.body;
    if (!name) return res.status(400).json({ error: 'Required: name' });
    const entry = await choresService.add({ name, frequency, notes, priority, propertyId, vehicleId });
    res.json({ chore: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/chores/:id', async (req, res) => {
  try {
    const { name, frequency, notes, priority, propertyId, vehicleId } = req.body;
    if (!name) return res.status(400).json({ error: 'Required: name' });
    const entry = await choresService.update(req.params.id, { name, frequency, notes, priority, propertyId, vehicleId });
    res.json({ chore: entry });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/chores/:id', async (req, res) => {
  try {
    await choresService.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/chores/:id/toggle', async (req, res) => {
  try {
    const entry = await choresService.toggleComplete(req.params.id);
    res.json({ chore: entry });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/export/ifirma', async (req, res) => {
  try {
    if (!ifirmaService.isConfigured()) {
      return res.status(501).json({ error: 'iFirma integration not configured - see .claude/skills/ifirma-integration/SKILL.md' });
    }
    const { historyId } = req.body;
    const historyEntry = historyId && await protocolsHistoryService.getById(historyId);
    if (!historyEntry) {
      return res.status(404).json({ error: 'Protocol history entry not found - generate protocols first' });
    }
    const entry = await ifirmaService.createInvoice({
      month: historyEntry.month,
      year: historyEntry.year,
      totalHours: historyEntry.totalHours,
      kwota: historyEntry.amount,
      orderNumber: historyEntry.orderNumber
    });
    res.json({ entry });
  } catch (err) {
    console.error(err);
    res.status(501).json({ error: err.message });
  }
});

// SPA fallback: client-side routing (switchSection) pushes URLs like /invoicing or /garage that
// don't correspond to a real file. A direct load or refresh on one of those must still serve the
// app shell - the section itself is picked from location.pathname by client JS on load. Must be
// registered last, after every other route, or it would swallow all the GET /api/* handlers above.
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Softcraft protokoly dziala na http://localhost:${port}`);
});
