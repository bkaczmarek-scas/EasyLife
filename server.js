require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const tempoService = require('./src/services/tempoService');
const pdfService = require('./src/services/pdfService');
const jiraService = require('./src/services/jiraService');
const bonusesService = require('./src/services/bonusesService');
const authService = require('./src/services/authService');
const ratesService = require('./src/services/ratesService');
const costsService = require('./src/services/costsService');

const app = express();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.get('/login', (req, res) => {
  if (req.session.authenticated) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!authService.isConfigured()) {
    return res.status(500).json({ error: 'Login is not set up yet. Run: node scripts/set-password.js' });
  }
  if (!email || !password || !authService.verify(email, password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  req.session.authenticated = true;
  req.session.email = email;
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
    taxxxoUrl: process.env.TAXXXO_URL || 'https://platforma2.taxxo.pl/',
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
    const { month, year, projects, totalHours } = req.body;
    if (!month || !year || !projects || totalHours == null) {
      return res.status(400).json({ error: 'Required: month, year, projects, totalHours' });
    }
    const { files } = await pdfService.generateProtocols(month, year, { projects, totalHours });
    res.json({
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

app.get('/api/bonuses', (req, res) => {
  try {
    res.json({ bonuses: bonusesService.getAll() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bonuses', (req, res) => {
  try {
    const { name, date, amount } = req.body;
    if (!name || !date || amount == null) {
      return res.status(400).json({ error: 'Required: name, date, amount' });
    }
    const entry = bonusesService.add({ name, date, amount: Number(amount) });
    res.json({ bonus: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/bonuses/:id', (req, res) => {
  try {
    const { name, date, amount } = req.body;
    if (!name || !date || amount == null) {
      return res.status(400).json({ error: 'Required: name, date, amount' });
    }
    const entry = bonusesService.update(req.params.id, { name, date, amount: Number(amount) });
    res.json({ bonus: entry });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/bonuses/:id', (req, res) => {
  try {
    bonusesService.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.get('/api/rates', (req, res) => {
  try {
    res.json({ history: ratesService.getAll() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rates', (req, res) => {
  try {
    const { from, rate } = req.body;
    if (!from || rate == null) {
      return res.status(400).json({ error: 'Required: from, rate' });
    }
    const entry = ratesService.add({ from, rate: Number(rate) });
    res.json({ rate: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/rates/:id', (req, res) => {
  try {
    const { from, rate } = req.body;
    if (!from || rate == null) {
      return res.status(400).json({ error: 'Required: from, rate' });
    }
    const entry = ratesService.update(req.params.id, { from, rate: Number(rate) });
    res.json({ rate: entry });
  } catch (err) {
    console.error(err);
    res.status(404).json({ error: err.message });
  }
});

app.delete('/api/rates/:id', (req, res) => {
  try {
    ratesService.remove(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(err.message.includes('At least one') ? 400 : 404).json({ error: err.message });
  }
});

app.get('/api/costs', (req, res) => {
  try {
    res.json({ costs: costsService.getAll() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/costs/:month', (req, res) => {
  try {
    const { zus, tax, accounting } = req.body;
    const entry = costsService.upsert(req.params.month, { zus, tax, accounting });
    res.json({ cost: entry });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Softcraft protokoly dziala na http://localhost:${port}`);
});
