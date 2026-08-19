// Pojazdy w garażu + historia serwisowa. Dwa oddzielne pliki JSON (podobnie jak rates/bonuses):
// data/vehicles.json (karty pojazdów) i data/serviceLog.json (wpisy historii per pojazd).
const fs = require('fs');
const path = require('path');
const { string, number, date: dateValue } = require('./validation');

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
  const entry = {
    id: newId(),
    name: string(name, 'name'),
    plate: string(plate, 'plate', { required: false, max: 32 }),
    vin: string(vin, 'vin', { required: false, max: 32 }),
    mileage: number(mileage ?? 0, 'mileage', { min: 0 }),
    nextServiceDate: dateValue(nextServiceDate, 'nextServiceDate'),
    insuranceExpiryDate: dateValue(insuranceExpiryDate, 'insuranceExpiryDate'),
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
  const newMileage = number(mileage ?? 0, 'mileage', { min: 0 });
  const mileageChanged = newMileage !== list[idx].mileage;
  list[idx] = {
    ...list[idx],
    name: string(name, 'name'),
    plate: string(plate, 'plate', { required: false, max: 32 }),
    vin: string(vin, 'vin', { required: false, max: 32 }),
    mileage: newMileage,
    nextServiceDate: dateValue(nextServiceDate, 'nextServiceDate'),
    insuranceExpiryDate: dateValue(insuranceExpiryDate, 'insuranceExpiryDate'),
    mileageUpdatedAt: mileageChanged ? new Date().toISOString() : list[idx].mileageUpdatedAt
  };
  writeAll(VEHICLES_FILE, list);
  return list[idx];
}

// Quick correction from the vehicle card - unlike the service-log-driven bump below, this always
// takes the given value (even lower), since it's an explicit manual correction, not a derived one.
function updateMileage(id, mileage) {
  const list = readAll(VEHICLES_FILE, SEED_VEHICLES);
  const idx = list.findIndex(v => v.id === id);
  if (idx === -1) throw new Error(`Vehicle not found: ${id}`);
  list[idx].mileage = number(mileage, 'mileage', { min: 0 });
  list[idx].mileageUpdatedAt = new Date().toISOString();
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
    id: newId(),
    vehicleId: string(vehicleId, 'vehicleId'),
    date: dateValue(date, 'date', { required: true }),
    type: string(type, 'type'),
    description: string(description, 'description', { required: false, max: 2000 }) || '',
    cost: number(cost ?? 0, 'cost', { min: 0 }),
    mileage: mileage != null && mileage !== '' ? number(mileage, 'mileage', { min: 0 }) : null
  };
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

function removeServiceEntry(id) {
  const list = readAll(SERVICE_LOG_FILE, SEED_SERVICE_LOG);
  const deleted = list.find(s => s.id === id);
  if (!deleted) throw new Error(`Service entry not found: ${id}`);
  const next = list.filter(s => s.id !== id);
  writeAll(SERVICE_LOG_FILE, next);

  if (deleted.mileage != null) {
    const vehicles = readAll(VEHICLES_FILE, SEED_VEHICLES);
    const vIdx = vehicles.findIndex(v => v.id === deleted.vehicleId);
    if (vIdx !== -1 && vehicles[vIdx].mileage === deleted.mileage) {
      const remainingMax = next
        .filter(s => s.vehicleId === deleted.vehicleId && s.mileage != null)
        .reduce((max, s) => Math.max(max, s.mileage), 0);
      vehicles[vIdx].mileage = remainingMax;
      vehicles[vIdx].mileageUpdatedAt = new Date().toISOString();
      writeAll(VEHICLES_FILE, vehicles);
    }
  }
}

module.exports = {
  getVehicles, addVehicle, updateVehicle, updateMileage, removeVehicle,
  getServiceLog, addServiceEntry, removeServiceEntry
};
