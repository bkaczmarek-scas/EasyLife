// Pojazdy w garażu + historia serwisowa. Dwa oddzielne pliki JSON (podobnie jak rates/bonuses):
// data/vehicles.json (karty pojazdów) i data/serviceLog.json (wpisy historii per pojazd).
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const VEHICLES_FILE = path.join(DATA_DIR, 'vehicles.json');
const SERVICE_LOG_FILE = path.join(DATA_DIR, 'serviceLog.json');

const SEED_VEHICLES = [
  { id: 'seed-v1', name: 'Škoda Octavia', plate: 'PO 12345', vin: 'TMBJJ7NE0N0123456', mileage: 68200, nextServiceDate: '2026-09-02', insuranceExpiryDate: '2027-01-10', mileageUpdatedAt: '2026-08-10T09:00:00.000Z' },
  { id: 'seed-v2', name: 'VW Transporter', plate: 'PO 98765', vin: 'WV1ZZZ7HZKH123456', mileage: 142500, nextServiceDate: '2026-10-15', insuranceExpiryDate: '2026-09-03', mileageUpdatedAt: '2026-08-05T09:00:00.000Z' }
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
  const numericMileage = mileage == null || mileage === '' ? 0 : Number(mileage);
  if (!Number.isFinite(numericMileage) || numericMileage < 0) throw new Error('Mileage must be a non-negative number');
  const entry = {
    id: newId(), name, plate, vin, mileage: numericMileage,
    nextServiceDate: nextServiceDate || null, insuranceExpiryDate: insuranceExpiryDate || null,
    mileageUpdatedAt: new Date().toISOString()
  };
  list.push(entry);
  writeAll(VEHICLES_FILE, list);
  return entry;
}

function updateVehicle(id, { name, plate, vin, mileage, nextServiceDate, insuranceExpiryDate }) {
  const list = readAll(VEHICLES_FILE, SEED_VEHICLES);
  const idx = list.findIndex(v => v.id === id);
  if (idx === -1) throw new Error(`Vehicle not found: ${id}`);
  const newMileage = Number(mileage);
  if (!Number.isFinite(newMileage) || newMileage < 0) throw new Error('Mileage must be a non-negative number');
  const mileageChanged = newMileage !== list[idx].mileage;
  list[idx] = {
    ...list[idx], name, plate, vin, mileage: newMileage,
    nextServiceDate: nextServiceDate || null, insuranceExpiryDate: insuranceExpiryDate || null,
    mileageUpdatedAt: mileageChanged ? new Date().toISOString() : list[idx].mileageUpdatedAt
  };
  writeAll(VEHICLES_FILE, list);
  return list[idx];
}

function updateMileage(id, mileage) {
  const list = readAll(VEHICLES_FILE, SEED_VEHICLES);
  const idx = list.findIndex(v => v.id === id);
  if (idx === -1) throw new Error(`Vehicle not found: ${id}`);
  const newMileage = Number(mileage);
  if (!Number.isFinite(newMileage) || newMileage < 0) throw new Error('Mileage must be a non-negative number');
  list[idx].mileage = newMileage;
  list[idx].mileageUpdatedAt = new Date().toISOString();
  writeAll(VEHICLES_FILE, list);
  return list[idx];
}

function removeVehicle(id) {
  const list = readAll(VEHICLES_FILE, SEED_VEHICLES);
  const next = list.filter(v => v.id !== id);
  if (next.length === list.length) throw new Error(`Vehicle not found: ${id}`);
  writeAll(VEHICLES_FILE, next);
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
  const entryMileage = mileage != null && mileage !== '' ? Number(mileage) : null;
  if (entryMileage != null && (!Number.isFinite(entryMileage) || entryMileage < 0)) {
    throw new Error('Service mileage must be a non-negative number');
  }
  const numericCost = cost == null || cost === '' ? 0 : Number(cost);
  if (!Number.isFinite(numericCost) || numericCost < 0) throw new Error('Service cost must be a non-negative number');
  const entry = { id: newId(), vehicleId, date, type, description: description || '', cost: numericCost, mileage: entryMileage };
  list.push(entry);
  writeAll(SERVICE_LOG_FILE, list);

  if (entry.mileage != null) {
    const vehicles = readAll(VEHICLES_FILE, SEED_VEHICLES);
    const vIdx = vehicles.findIndex(v => v.id === vehicleId);
    if (vIdx !== -1) {
      if (entry.mileage > vehicles[vIdx].mileage) vehicles[vIdx].mileage = entry.mileage;
      vehicles[vIdx].mileageUpdatedAt = new Date().toISOString();
      writeAll(VEHICLES_FILE, vehicles);
    }
  }

  return entry;
}

function recalculateMileage(currentMileage, deletedMileage, remainingLogs) {
  const current = Number(currentMileage);
  const deleted = Number(deletedMileage);
  if (!Number.isFinite(current)) return currentMileage;
  if (!Number.isFinite(deleted) || current !== deleted) return currentMileage;
  const remainingMileages = remainingLogs
    .filter(s => s.mileage != null && Number.isFinite(Number(s.mileage)))
    .map(s => Number(s.mileage));
  return remainingMileages.length ? Math.max(...remainingMileages) : 0;
}

function removeServiceEntry(id) {
  const list = readAll(SERVICE_LOG_FILE, SEED_SERVICE_LOG);
  const entry = list.find(s => s.id === id);
  if (!entry) throw new Error(`Service entry not found: ${id}`);
  const next = list.filter(s => s.id !== id);
  writeAll(SERVICE_LOG_FILE, next);

  const vehicles = readAll(VEHICLES_FILE, SEED_VEHICLES);
  const vIdx = vehicles.findIndex(v => v.id === entry.vehicleId);
  if (vIdx !== -1) {
    const remainingLogs = next.filter(s => s.vehicleId === entry.vehicleId);
    const recalculated = recalculateMileage(vehicles[vIdx].mileage, entry.mileage, remainingLogs);
    if (recalculated !== vehicles[vIdx].mileage) {
      vehicles[vIdx].mileage = recalculated;
      vehicles[vIdx].mileageUpdatedAt = new Date().toISOString();
      writeAll(VEHICLES_FILE, vehicles);
    }
  }
}

module.exports = {
  getVehicles, addVehicle, updateVehicle, updateMileage, removeVehicle,
  getServiceLog, addServiceEntry, removeServiceEntry, recalculateMileage
};
