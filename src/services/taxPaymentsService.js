// Plac. podatku ryczaltowego od najmu (Sienkiewicza + Szczesliwa) - per-property split kwoty
// (sienkiewicza/szczesliwa) sa opcjonalne, bo nie dla kazdego miesiaca jest potwierdzony podzial
// laczej wplaty (patrz "amount" - to zawsze prawdziwa, przelana suma, niezaleznie od tego czy
// podzial jest znany).
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const TAX_PAYMENTS_FILE = path.join(DATA_DIR, 'taxPayments.json');

const SEED_TAX_PAYMENTS = [
  { id: 'seed-tx1', period: '2026-01', amount: 250, sienkiewicza: 130, szczesliwa: 120, transferDate: '2026-02-03' }
];

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(TAX_PAYMENTS_FILE)) fs.writeFileSync(TAX_PAYMENTS_FILE, JSON.stringify(SEED_TAX_PAYMENTS, null, 2));
}

function readAll() {
  ensureFile();
  return JSON.parse(fs.readFileSync(TAX_PAYMENTS_FILE, 'utf8'));
}

function writeAll(list) {
  fs.writeFileSync(TAX_PAYMENTS_FILE, JSON.stringify(list, null, 2));
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getAll() {
  return readAll().sort((a, b) => a.period.localeCompare(b.period));
}

function toNullableNumber(v) {
  return v === null || v === undefined || v === '' ? null : Number(v);
}

function add({ period, amount, sienkiewicza, szczesliwa, sienkiewiczaNote, szczesliwaNote, transferDate }) {
  const list = readAll();
  const entry = {
    id: newId(), period, amount: Number(amount) || 0,
    sienkiewicza: toNullableNumber(sienkiewicza), szczesliwa: toNullableNumber(szczesliwa),
    sienkiewiczaNote: sienkiewiczaNote || '', szczesliwaNote: szczesliwaNote || '',
    transferDate: transferDate || null
  };
  list.push(entry);
  writeAll(list);
  return entry;
}

function update(id, { period, amount, sienkiewicza, szczesliwa, sienkiewiczaNote, szczesliwaNote, transferDate }) {
  const list = readAll();
  const idx = list.findIndex(t => t.id === id);
  if (idx === -1) throw new Error(`Tax payment not found: ${id}`);
  list[idx] = {
    ...list[idx], period, amount: Number(amount) || 0,
    sienkiewicza: toNullableNumber(sienkiewicza), szczesliwa: toNullableNumber(szczesliwa),
    sienkiewiczaNote: sienkiewiczaNote || '', szczesliwaNote: szczesliwaNote || '',
    transferDate: transferDate || null
  };
  writeAll(list);
  return list[idx];
}

function remove(id) {
  const list = readAll();
  const next = list.filter(t => t.id !== id);
  if (next.length === list.length) throw new Error(`Tax payment not found: ${id}`);
  writeAll(next);
}

module.exports = { getAll, add, update, remove };
