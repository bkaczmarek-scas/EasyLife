// Historia stawek godzinowych — jedyne zrodlo prawdy uzywane zarowno przy generowaniu
// protokolow (kwota = godziny x stawka obowiazujaca w danym miesiacu), jak i w sekcji Rates
// w UI (przez /api/rates). Przechowywane w pliku, edytowalne z poziomu UI.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'rates.json');

const SEED = [
  { id: 'seed-2025-07', from: '2025-07', rate: 90 },
  { id: 'seed-2026-07', from: '2026-07', rate: 100 }
];

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(SEED, null, 2));
}

function readAll() {
  ensureFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function getAll() {
  return readAll().sort((a, b) => a.from.localeCompare(b.from));
}

function getRateForMonth(year, month) {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const sorted = getAll();
  if (!sorted.length) return 0;
  let applicable = sorted[0].rate;
  for (const entry of sorted) {
    if (entry.from <= key) applicable = entry.rate; else break;
  }
  return applicable;
}

function add({ from, rate }) {
  const list = readAll();
  const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, from, rate };
  list.push(entry);
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
  return entry;
}

function update(id, { from, rate }) {
  const list = readAll();
  const idx = list.findIndex(r => r.id === id);
  if (idx === -1) throw new Error(`Rate not found: ${id}`);
  list[idx] = { ...list[idx], from, rate };
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
  return list[idx];
}

function remove(id) {
  const list = readAll();
  if (list.length <= 1) throw new Error('At least one rate entry is required');
  const next = list.filter(r => r.id !== id);
  if (next.length === list.length) throw new Error(`Rate not found: ${id}`);
  fs.writeFileSync(DATA_FILE, JSON.stringify(next, null, 2));
}

module.exports = { getAll, getRateForMonth, add, update, remove };
