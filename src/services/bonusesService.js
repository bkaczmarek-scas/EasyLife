const fs = require('fs');
const path = require('path');
const { isNonEmptyString, isFiniteNumber, isDateString } = require('../validation');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'bonuses.json');

const SEED = [
  { id: 'seed-dywidenda-2026-06', name: 'Dywidenda', date: '2026-06-30', amount: 9000 }
];

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(SEED, null, 2));
}
function readAll() { ensureFile(); return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function getAll() { return readAll().sort((a, b) => a.date.localeCompare(b.date)); }

function validate({ name, date, amount }) {
  if (!isNonEmptyString(name)) throw new Error('Bonus name is required');
  if (!isDateString(date)) throw new Error('Bonus date must be YYYY-MM-DD');
  if (!isFiniteNumber(amount, { min: 0 })) throw new Error('Bonus amount must be a non-negative number');
}

function add({ name, date, amount }) {
  validate({ name, date, amount });
  const list = readAll();
  const entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: name.trim(), date, amount: Number(amount) };
  list.push(entry);
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
  return entry;
}

function update(id, { name, date, amount }) {
  validate({ name, date, amount });
  const list = readAll();
  const idx = list.findIndex(b => b.id === id);
  if (idx === -1) throw new Error(`Bonus not found: ${id}`);
  list[idx] = { ...list[idx], name: name.trim(), date, amount: Number(amount) };
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
  return list[idx];
}

function remove(id) {
  const list = readAll();
  const next = list.filter(b => b.id !== id);
  if (next.length === list.length) throw new Error(`Bonus not found: ${id}`);
  fs.writeFileSync(DATA_FILE, JSON.stringify(next, null, 2));
}

module.exports = { getAll, add, update, remove };
