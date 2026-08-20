// Wydatki per nieruchomosc (naprawy, oplaty jednorazowe itp.) - osobna kolekcja od
// propertiesService, bo lista wydatkow rosnie w czasie i nie powinna byc zagniezdzona w
// rekordzie property (to samo podejscie co serviceLog dla pojazdow w vehiclesService).
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'propertyExpenses.json');

const SEED_EXPENSES = [
  { id: 'seed-pe1', propertyId: 'seed-p1', date: '2026-02-10', description: 'Przykladowa naprawa', amount: 250 }
];

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_EXPENSES, null, 2));
}

function readAll() {
  ensureFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeAll(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getAll(propertyId) {
  const all = readAll();
  const filtered = propertyId ? all.filter(e => e.propertyId === propertyId) : all;
  return filtered.sort((a, b) => b.date.localeCompare(a.date));
}

function add({ propertyId, date, description, amount }) {
  const list = readAll();
  const entry = {
    id: newId(), propertyId, date, description: description || '', amount: Number(amount) || 0
  };
  list.push(entry);
  writeAll(list);
  return entry;
}

function update(id, { date, description, amount }) {
  const list = readAll();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) throw new Error(`Expense not found: ${id}`);
  list[idx] = {
    ...list[idx], date, description: description || '', amount: Number(amount) || 0
  };
  writeAll(list);
  return list[idx];
}

function remove(id) {
  const list = readAll();
  const next = list.filter(e => e.id !== id);
  if (next.length === list.length) throw new Error(`Expense not found: ${id}`);
  writeAll(next);
}

module.exports = { getAll, add, update, remove };
