// Cykliczne domowe obowiazki. Kazdy chore trzyma surowa liste dat ukonczenia (completions);
// streak i "czy zrobione w tym okresie" sa liczone tutaj (nie w JS klienta), zeby logika okresow
// (dzien/tydzien/miesiac) miala jedno zrodlo prawdy.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'chores.json');

const SEED_CHORES = [
  { id: 'seed-ch1', name: 'Replace HVAC filter', frequency: 'monthly', notes: '', completions: [] },
  { id: 'seed-ch2', name: 'Water plants', frequency: 'weekly', notes: '', completions: [] },
  { id: 'seed-ch3', name: 'Take out recycling', frequency: 'weekly', notes: '', completions: [] }
];

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_CHORES, null, 2));
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

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Every frequency collapses a date to a single integer bucket, so "same period" is just equality
// and "previous period" is just -1 - no separate calendar-week/month-boundary code per frequency.
function periodIndex(dateStr, frequency) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (frequency === 'monthly') return d.getFullYear() * 12 + d.getMonth();
  const days = Math.floor(d.getTime() / 86400000);
  if (frequency === 'weekly') return Math.floor(days / 7);
  return days; // daily
}

function isDoneThisPeriod(completions, frequency) {
  const current = periodIndex(todayStr(), frequency);
  return completions.some(c => periodIndex(c, frequency) === current);
}

function computeStreak(completions, frequency) {
  if (!completions.length) return 0;
  const periods = [...new Set(completions.map(c => periodIndex(c, frequency)))].sort((a, b) => b - a);
  const current = periodIndex(todayStr(), frequency);
  // A streak only counts if it's still "alive" - most recent completion is this period or the last one.
  if (periods[0] !== current && periods[0] !== current - 1) return 0;
  let streak = 0;
  let expected = periods[0];
  for (const p of periods) {
    if (p !== expected) break;
    streak++;
    expected--;
  }
  return streak;
}

function decorate(chore) {
  return {
    ...chore,
    doneThisPeriod: isDoneThisPeriod(chore.completions || [], chore.frequency),
    streak: computeStreak(chore.completions || [], chore.frequency)
  };
}

function getAll() {
  return readAll().sort((a, b) => a.name.localeCompare(b.name)).map(decorate);
}

function add({ name, frequency, notes }) {
  const list = readAll();
  const entry = { id: newId(), name, frequency: ['daily', 'weekly', 'monthly'].includes(frequency) ? frequency : 'weekly', notes: notes || '', completions: [] };
  list.push(entry);
  writeAll(list);
  return decorate(entry);
}

function update(id, { name, frequency, notes }) {
  const list = readAll();
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) throw new Error(`Chore not found: ${id}`);
  list[idx] = { ...list[idx], name, frequency: ['daily', 'weekly', 'monthly'].includes(frequency) ? frequency : 'weekly', notes: notes || '' };
  writeAll(list);
  return decorate(list[idx]);
}

function remove(id) {
  const list = readAll();
  const next = list.filter(c => c.id !== id);
  if (next.length === list.length) throw new Error(`Chore not found: ${id}`);
  writeAll(next);
}

function toggleComplete(id) {
  const list = readAll();
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) throw new Error(`Chore not found: ${id}`);
  const chore = list[idx];
  const current = periodIndex(todayStr(), chore.frequency);
  const hasThisPeriod = (chore.completions || []).some(c => periodIndex(c, chore.frequency) === current);
  chore.completions = hasThisPeriod
    ? chore.completions.filter(c => periodIndex(c, chore.frequency) !== current)
    : [...(chore.completions || []), todayStr()];
  writeAll(list);
  return decorate(chore);
}

module.exports = { getAll, add, update, remove, toggleComplete };
