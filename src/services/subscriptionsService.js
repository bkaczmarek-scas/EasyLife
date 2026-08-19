// Aktywne subskrypcje (Netflix, Spotify, silownia...). Prosty JSON per rekord, ten sam wzorzec
// co vehicles/properties - jedna nieruchoma kolekcja bez zagniezdzonych podobiektow.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'subscriptions.json');

const SEED_SUBSCRIPTIONS = [
  { id: 'seed-s1', name: 'Netflix', category: 'Streaming', cost: 43, billingCycle: 'monthly', nextRenewalDate: '2026-09-05', autoRenew: true },
  { id: 'seed-s2', name: 'Spotify', category: 'Streaming', cost: 23.99, billingCycle: 'monthly', nextRenewalDate: '2026-08-22', autoRenew: true },
  { id: 'seed-s3', name: 'City Gym', category: 'Gym', cost: 149, billingCycle: 'monthly', nextRenewalDate: '2026-09-01', autoRenew: true },
  { id: 'seed-s4', name: 'iCloud+', category: 'Software', cost: 299, billingCycle: 'yearly', nextRenewalDate: '2027-02-14', autoRenew: true }
];

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_SUBSCRIPTIONS, null, 2));
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

function getAll() {
  return readAll().sort((a, b) => a.name.localeCompare(b.name));
}

function add({ name, category, cost, billingCycle, nextRenewalDate, autoRenew }) {
  const list = readAll();
  const entry = {
    id: newId(), name, category: category || '',
    cost: Number(cost) || 0, billingCycle: billingCycle === 'yearly' ? 'yearly' : 'monthly',
    nextRenewalDate: nextRenewalDate || null, autoRenew: Boolean(autoRenew)
  };
  list.push(entry);
  writeAll(list);
  return entry;
}

function update(id, { name, category, cost, billingCycle, nextRenewalDate, autoRenew }) {
  const list = readAll();
  const idx = list.findIndex(s => s.id === id);
  if (idx === -1) throw new Error(`Subscription not found: ${id}`);
  list[idx] = {
    ...list[idx], name, category: category || '',
    cost: Number(cost) || 0, billingCycle: billingCycle === 'yearly' ? 'yearly' : 'monthly',
    nextRenewalDate: nextRenewalDate || null, autoRenew: Boolean(autoRenew)
  };
  writeAll(list);
  return list[idx];
}

function remove(id) {
  const list = readAll();
  const next = list.filter(s => s.id !== id);
  if (next.length === list.length) throw new Error(`Subscription not found: ${id}`);
  writeAll(next);
}

module.exports = { getAll, add, update, remove };
