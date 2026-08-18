// Recznie wprowadzane koszty uzyskania przychodu (ZUS, podatek, ksiegowa) per miesiac.
// Jeden wpis na miesiac (klucz 'YYYY-MM'), edytowalny z sekcji Income w UI.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'costs.json');

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

function readAll() {
  ensureFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function getAll() {
  return readAll().sort((a, b) => a.month.localeCompare(b.month));
}

function upsert(month, { zus, tax, accounting }) {
  const list = readAll();
  const entry = {
    month,
    zus: Number(zus) || 0,
    tax: Number(tax) || 0,
    accounting: Number(accounting) || 0
  };
  const idx = list.findIndex(c => c.month === month);
  if (idx === -1) list.push(entry);
  else list[idx] = entry;
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
  return entry;
}

module.exports = { getAll, upsert };
