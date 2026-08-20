// Pojazdy w garazu + historia serwisowa. Dwie tabele (podobnie jak rates/bonuses byly dwoma
// plikami JSON): Vehicle (karty pojazdow) i ServiceLogEntry (wpisy historii per pojazd, FK z
// cascade delete - usuniecie pojazdu kasuje jego historie serwisowa, tak jak przed migracja).
const prisma = require('../db/prisma');

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Manually orderable via `order` (lower first) - falls back to name so vehicles added without
// ever setting an order (e.g. straight through the API) still sort predictably.
async function getVehicles() {
  const rows = await prisma.vehicle.findMany();
  return rows.sort((a, b) => {
    if (a.order != null && b.order != null) return a.order - b.order;
    if (a.order != null) return -1;
    if (b.order != null) return 1;
    return a.name.localeCompare(b.name);
  });
}

async function addVehicle({ name, type, year, engine, fuelType, power, plate, vin, mileage, nextServiceDate, insuranceExpiryDate }) {
  return prisma.vehicle.create({
    data: {
      id: newId(), name, type: type || 'car', year: year ? Number(year) : null,
      engine: engine || null, fuelType: fuelType || null, power: power ? Number(power) : null,
      plate, vin, mileage: Number(mileage) || 0,
      nextServiceDate: nextServiceDate || null, insuranceExpiryDate: insuranceExpiryDate || null,
      mileageUpdatedAt: new Date().toISOString()
    }
  });
}

async function updateVehicle(id, { name, type, year, engine, fuelType, power, plate, vin, mileage, nextServiceDate, insuranceExpiryDate }) {
  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) throw new Error(`Vehicle not found: ${id}`);
  const newMileage = Number(mileage) || 0;
  const mileageChanged = newMileage !== existing.mileage;
  return prisma.vehicle.update({
    where: { id },
    data: {
      name, type: type || 'car', year: year ? Number(year) : null,
      engine: engine || null, fuelType: fuelType || null, power: power ? Number(power) : null,
      plate, vin, mileage: newMileage,
      nextServiceDate: nextServiceDate || null, insuranceExpiryDate: insuranceExpiryDate || null,
      mileageUpdatedAt: mileageChanged ? new Date().toISOString() : existing.mileageUpdatedAt
    }
  });
}

// Quick correction from the vehicle card - unlike the service-log-driven bump below, this always
// takes the given value (even lower), since it's an explicit manual correction, not a derived one.
async function updateMileage(id, mileage) {
  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) throw new Error(`Vehicle not found: ${id}`);
  return prisma.vehicle.update({
    where: { id },
    data: { mileage: Number(mileage) || 0, mileageUpdatedAt: new Date().toISOString() }
  });
}

async function removeVehicle(id) {
  const existing = await prisma.vehicle.findUnique({ where: { id } });
  if (!existing) throw new Error(`Vehicle not found: ${id}`);
  await prisma.vehicle.delete({ where: { id } });
}

function withItems(entry) {
  const { items, ...rest } = entry;
  return { ...rest, items: items.sort((a, b) => a.sortOrder - b.sortOrder).map((i) => i.description) };
}

async function getServiceLog(vehicleId) {
  const rows = await prisma.serviceLogEntry.findMany({
    where: vehicleId ? { vehicleId } : undefined,
    include: { items: true }
  });
  return rows.sort((a, b) => b.date.localeCompare(a.date)).map(withItems);
}

async function addServiceEntry({ vehicleId, date, workshop, items, cost, mileage }) {
  const mileageValue = mileage != null && mileage !== '' ? Number(mileage) : null;
  const entry = await prisma.serviceLogEntry.create({
    data: {
      id: newId(), vehicleId, date, workshop: workshop || '',
      cost: Number(cost) || 0, mileage: mileageValue,
      items: {
        create: (items || []).map((description, i) => ({ id: newId(), description, sortOrder: i }))
      }
    },
    include: { items: true }
  });

  // Keep the vehicle's headline mileage current. The number itself only ever moves forward, so
  // logging an older/backdated service can't regress the odometer reading on the vehicle card -
  // but the "last updated" timestamp always bumps, so logging a service is always visibly
  // reflected even when the entered mileage happens to match what's already on file.
  if (mileageValue != null) {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (vehicle) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          mileage: mileageValue > vehicle.mileage ? mileageValue : vehicle.mileage,
          mileageUpdatedAt: new Date().toISOString()
        }
      });
    }
  }

  return withItems(entry);
}

async function removeServiceEntry(id) {
  const existing = await prisma.serviceLogEntry.findUnique({ where: { id } });
  if (!existing) throw new Error(`Service entry not found: ${id}`);
  await prisma.serviceLogEntry.delete({ where: { id } });
}

module.exports = {
  getVehicles, addVehicle, updateVehicle, updateMileage, removeVehicle,
  getServiceLog, addServiceEntry, removeServiceEntry
};
