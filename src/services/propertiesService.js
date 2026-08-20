// Nieruchomości + najemcy. Jedna nieruchomość ma co najwyżej jednego najemcę na raz, więc dane
// najemcy trzymane są zagnieżdżone w rekordzie property (property.tenant), zamiast osobnej
// kolekcji - upraszcza to CRUD z poziomu jednego formularza w UI.
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const PROPERTIES_FILE = path.join(DATA_DIR, 'properties.json');

const SEED_PROPERTIES = [
  {
    id: 'seed-p1', name: 'Rodzinny dom', type: 'primary', address: 'ul. Kwiatowa 12, Poznań',
    tenant: null, comments: [],
    maintenanceNote: 'Bathroom renovation planned', maintenanceDate: '2026-09-20'
  },
  {
    id: 'seed-p2', name: 'Mieszkanie Przykładowe', type: 'rental', address: 'ul. Przykładowa 45/3, Poznań',
    tenant: {
      tenants: [{ name: 'Anna Nowak', phone: '+48 601 234 567', email: 'anna.nowak@example.com' }],
      leaseStart: '2025-10-01', leaseEnd: '2026-09-30',
      rentAmount: 2400, utilityAdvance: 900, taxDue: 0, deposit: 2400,
      gateCode: '', notes: ''
    },
    comments: []
  }
];

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(PROPERTIES_FILE)) fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(SEED_PROPERTIES, null, 2));
}

function readAll() {
  ensureFile();
  return JSON.parse(fs.readFileSync(PROPERTIES_FILE, 'utf8'));
}

function writeAll(list) {
  fs.writeFileSync(PROPERTIES_FILE, JSON.stringify(list, null, 2));
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getAll() {
  return readAll().sort((a, b) => a.name.localeCompare(b.name));
}

function normalizeTenant(type, tenant) {
  if (type !== 'rental' || !tenant) return null;
  const tenants = (tenant.tenants || [])
    .filter(t => t && t.name)
    .map(t => ({ name: t.name, phone: t.phone || '', email: t.email || '' }));
  if (!tenants.length) return null;
  return {
    tenants,
    leaseStart: tenant.leaseStart || null,
    leaseEnd: tenant.leaseEnd || null,
    rentAmount: Number(tenant.rentAmount) || 0,
    utilityAdvance: Number(tenant.utilityAdvance) || 0,
    taxDue: Number(tenant.taxDue) || 0,
    deposit: Number(tenant.deposit) || 0,
    gateCode: tenant.gateCode || '',
    notes: tenant.notes || ''
  };
}

function add({ name, type, address, tenant, maintenanceNote, maintenanceDate }) {
  const list = readAll();
  const entry = {
    id: newId(), name, type: type === 'rental' ? 'rental' : 'primary', address, tenant: normalizeTenant(type, tenant), comments: [],
    maintenanceNote: maintenanceNote || '', maintenanceDate: maintenanceDate || null
  };
  list.push(entry);
  writeAll(list);
  return entry;
}

function update(id, { name, type, address, tenant, maintenanceNote, maintenanceDate }) {
  const list = readAll();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) throw new Error(`Property not found: ${id}`);
  list[idx] = {
    ...list[idx], name, type: type === 'rental' ? 'rental' : 'primary', address, tenant: normalizeTenant(type, tenant),
    maintenanceNote: maintenanceNote || '', maintenanceDate: maintenanceDate || null
  };
  writeAll(list);
  return list[idx];
}

function remove(id) {
  const list = readAll();
  const next = list.filter(p => p.id !== id);
  if (next.length === list.length) throw new Error(`Property not found: ${id}`);
  writeAll(next);
}

function addComment(id, text) {
  const list = readAll();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) throw new Error(`Property not found: ${id}`);
  const comment = { id: newId(), text, resolved: false, createdAt: new Date().toISOString() };
  if (!list[idx].comments) list[idx].comments = [];
  list[idx].comments.push(comment);
  writeAll(list);
  return list[idx];
}

function toggleCommentResolved(id, commentId) {
  const list = readAll();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) throw new Error(`Property not found: ${id}`);
  const comment = (list[idx].comments || []).find(c => c.id === commentId);
  if (!comment) throw new Error(`Comment not found: ${commentId}`);
  comment.resolved = !comment.resolved;
  writeAll(list);
  return list[idx];
}

function removeComment(id, commentId) {
  const list = readAll();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) throw new Error(`Property not found: ${id}`);
  const comments = list[idx].comments || [];
  const next = comments.filter(c => c.id !== commentId);
  if (next.length === comments.length) throw new Error(`Comment not found: ${commentId}`);
  list[idx].comments = next;
  writeAll(list);
  return list[idx];
}

module.exports = { getAll, add, update, remove, addComment, removeComment, toggleCommentResolved };
