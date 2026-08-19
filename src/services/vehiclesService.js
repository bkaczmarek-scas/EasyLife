// Pojazdy w garażu + historia serwisowa. Dwa oddzielne pliki JSON (podobnie jak rates/bonuses):
// data/vehicles.json (karty pojazdów) i data/serviceLog.json (wpisy historii per pojazd).
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const VEHICLES_FILE = path.join(DATA_DIR, 'vehicles.json');
const SERVICE_LOG_FILE = path.join(DATA_DIR, 'serviceLog.json');

const SEED_VEHICLES = [
  { id: 'seed-v1', name: 'Škoda Octavia', plate: 'PO 12345', vin: 'TMBJJ7NE0N0123456', mileage: 68200, nextServiceDate: '2026-09-02', insuranceExpiryDate: '2027-01-10' },
  { id: 'seed-v2', name: 'VW Transporter', plate: 'PO 98765', vin: 'WV1ZZZ7HZKH123456', mileage: 142500, nextServiceDate: '2026-10-15', insuranceExpiryDate: '2026-09-03' }
];

const SEED_SERVICE_LOG = [
  { id: 'seed-s1', vehicleId: 'seed-v1', date: '2026-03-04', type: 'Oil change', description: 'Full synthetic oil + filter', cost: 420, mileage: 65000 },
  { id: 'seed-s2', vehicleId: 'seed-v1', date: '2025-09-11', type: 'Repair', description: 'Front brake pads and discs', cost: 980, mileage: 58000 },
  { id: 'seed-s3', vehicleId: 'seed-v2', date: '2026-01-20', type: 'Inspection', description: 'Annual technical inspection', cost: 150, mileage: 138000 }
];

function ensureFile(file, seed) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(seed, null, 2));
}

function readAll(file, seed) {
  ensureFile(file, seed);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeAll(file, list) {
  fs.writeFileSync(file, JSON.stringify(list, null, 2));
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getVehicles() {
  return readAll(VEHICLES_FILE, SEED_VEHICLES).sort((a, b) => a.name.localeCompare(b.name));
}

function addVehicle({ name, plate, vin, mileage, nextServiceDate, insuranceExpiryDate }) {
  const list = readAll(VEHICLES_FILE, SEED_VEHICLES);
  const entry = { id: newId(), name, plate, vin, mileage: Number(mileage) || 0, nextServiceDate: nextServiceDate || null, insuranceExpiryDate: insuranceExpiryDate || null };
  list.push(entry);
  writeAll(VEHICLES_FILE, list);
  return entry;
}

function updateVehicle(id, { name, plate, vin, mileage, nextServiceDate, insuranceExpiryDate }) {
  const list = readAll(VEHICLES_FILE, SEED_VEHICLES);
  const idx = list.findIndex(v => v.id === id);
  if (idx === -1) throw new Error(`Vehicle not found: ${id}`);
  list[idx] = { ...list[idx], name, plate, vin, mileage: Number(mileage) || 0, nextServiceDate: nextServiceDate || null, insuranceExpiryDate: insuranceExpiryDate || null };
  writeAll(VEHICLES_FILE, list);
  return list[idx];
}

function removeVehicle(id) {
  const list = readAll(VEHICLES_FILE, SEED_VEHICLES);
  const next = list.filter(v => v.id !== id);
  if (next.length === list.length) throw new Error(`Vehicle not found: ${id}`);
  writeAll(VEHICLES_FILE, next);
  // Vehicle removed - its service log entries no longer point anywhere useful, drop them too.
  const logs = readAll(SERVICE_LOG_FILE, SEED_SERVICE_LOG).filter(s => s.vehicleId !== id);
  writeAll(SERVICE_LOG_FILE, logs);
}

function getServiceLog(vehicleId) {
  const all = readAll(SERVICE_LOG_FILE, SEED_SERVICE_LOG);
  const filtered = vehicleId ? all.filter(s => s.vehicleId === vehicleId) : all;
  return filtered.sort((a, b) => b.date.localeCompare(a.date));
}

function addServiceEntry({ vehicleId, date, type, description, cost, mileage }) {
  const list = readAll(SERVICE_LOG_FILE, SEED_SERVICE_LOG);
  const entry = {
    id: newId(), vehicleId, date, type, description: description || '', cost: Number(cost) || 0,
    mileage: mileage != null && mileage !== '' ? Number(mileage) : null
  };
  list.push(entry);
  writeAll(SERVICE_LOG_FILE, list);

  // Keep the vehicle's headline mileage current - only move it forward, never backward, so
  // logging an older/backdated service can't regress the odometer reading on the vehicle card.
  if (entry.mileage != null) {
    const vehicles = readAll(VEHICLES_FILE, SEED_VEHICLES);
    const vIdx = vehicles.findIndex(v => v.id === vehicleId);
    if (vIdx !== -1 && entry.mileage > vehicles[vIdx].mileage) {
      vehicles[vIdx].mileage = entry.mileage;
      writeAll(VEHICLES_FILE, vehicles);
    }
  }

  return entry;
}

function removeServiceEntry(id) {
  const list = readAll(SERVICE_LOG_FILE, SEED_SERVICE_LOG);
  const next = list.filter(s => s.id !== id);
  if (next.length === list.length) throw new Error(`Service entry not found: ${id}`);
  writeAll(SERVICE_LOG_FILE, next);
}

module.exports = {
  getVehicles, addVehicle, updateVehicle, removeVehicle,
  getServiceLog, addServiceEntry, removeServiceEntry
};
