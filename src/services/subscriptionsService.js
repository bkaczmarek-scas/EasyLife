// Aktywne subskrypcje (Netflix, Spotify, silownia...). Prosty JSON per rekord.
const fs = require('fs');
const path = require('path');
const { isNonEmptyString, isFiniteNumber, isDateString } = require('../validation');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'subscriptions.json');
const SEED_SUBSCRIPTIONS = [
  { id: 'seed-s1', name: 'Netflix', category: 'Streaming', cost: 43, billingCycle: 'monthly', nextRenewalDate: '2026-09-05', autoRenew: true, lastUsedDate: '2026-08-17' },
  { id: 'seed-s2', name: 'Spotify', category: 'Streaming', cost: 23.99, billingCycle: 'monthly', nextRenewalDate: '2026-08-22', autoRenew: true, lastUsedDate: '2026-08-18' },
  { id: 'seed-s3', name: 'City Gym', category: 'Gym', cost: 149, billingCycle: 'monthly', nextRenewalDate: '2026-09-01', autoRenew: true, lastUsedDate: '2026-08-12' },
  { id: 'seed-s4', name: 'iCloud+', category: 'Software', cost: 299, billingCycle: 'yearly', nextRenewalDate: '2027-02-14', autoRenew: true, lastUsedDate: '2026-08-16' },
  { id: 'seed-s5', name: 'Disney+', category: 'Streaming', cost: 30, billingCycle: 'monthly', nextRenewalDate: '2026-09-10', autoRenew: true, lastUsedDate: '2026-06-05' }
];
function ensureFile() { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_SUBSCRIPTIONS, null, 2)); }
function readAll() { ensureFile(); return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function writeAll(list) { fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2)); }
function newId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function getAll() { return readAll().sort((a, b) => a.name.localeCompare(b.name)); }
function validate({ name, cost, billingCycle, nextRenewalDate, lastUsedDate }) {
  if (!isNonEmptyString(name)) throw new Error('Subscription name is required');
  if (!isFiniteNumber(cost, { min: 0 })) throw new Error('Subscription cost must be a non-negative number');
  if (!['monthly', 'yearly'].includes(billingCycle)) throw new Error('Billing cycle must be monthly or yearly');
  if (nextRenewalDate && !isDateString(nextRenewalDate)) throw new Error('Next renewal date must be YYYY-MM-DD');
  if (lastUsedDate && !isDateString(lastUsedDate)) throw new Error('Last used date must be YYYY-MM-DD');
}
function add(data) {
  validate(data); const list = readAll();
  const entry = { id: newId(), name: data.name.trim(), category: data.category || '', cost: Number(data.cost), billingCycle: data.billingCycle, nextRenewalDate: data.nextRenewalDate || null, autoRenew: Boolean(data.autoRenew), lastUsedDate: data.lastUsedDate || null };
  list.push(entry); writeAll(list); return entry;
}
function update(id, data) {
  validate(data); const list = readAll(); const idx = list.findIndex(s => s.id === id);
  if (idx === -1) throw new Error(`Subscription not found: ${id}`);
  list[idx] = { ...list[idx], name: data.name.trim(), category: data.category || '', cost: Number(data.cost), billingCycle: data.billingCycle, nextRenewalDate: data.nextRenewalDate || null, autoRenew: Boolean(data.autoRenew), lastUsedDate: data.lastUsedDate || null };
  writeAll(list); return list[idx];
}
function remove(id) { const list = readAll(); const next = list.filter(s => s.id !== id); if (next.length === list.length) throw new Error(`Subscription not found: ${id}`); writeAll(next); }
module.exports = { getAll, add, update, remove };
