// Jednorazowa migracja istniejacych danych z plikow data/*.json (+ PDF-y z data/protocols/) do
// Postgresa. Uruchamiane raz, po `npx prisma migrate dev`, zeby przeniesc dotychczasowa historie
// zanim wszystkie serwisy zaczna czytac wylacznie z bazy. Idempotentne (upsert po oryginalnych
// id) - bezpiecznie odpalic ponownie, jesli cos w polowie sie wywali.
// Uzycie: node scripts/importJsonToDb.js
const fs = require('fs');
const path = require('path');
const prisma = require('../src/db/prisma');

const DATA_DIR = path.join(__dirname, '..', 'data');

function readJson(filename, fallback) {
  const file = path.join(DATA_DIR, filename);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readFileIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

async function importRates() {
  const rows = readJson('rates.json', []);
  for (const r of rows) {
    await prisma.rate.upsert({ where: { id: r.id }, create: { id: r.id, from: r.from, rate: r.rate }, update: { from: r.from, rate: r.rate } });
  }
  console.log(`rates: ${rows.length}`);
}

async function importBonuses() {
  const rows = readJson('bonuses.json', []);
  for (const b of rows) {
    await prisma.bonus.upsert({ where: { id: b.id }, create: { id: b.id, name: b.name, date: b.date, amount: b.amount }, update: { name: b.name, date: b.date, amount: b.amount } });
  }
  console.log(`bonuses: ${rows.length}`);
}

async function importCosts() {
  const rows = readJson('costs.json', []);
  for (const c of rows) {
    await prisma.cost.upsert({ where: { month: c.month }, create: { month: c.month, zus: c.zus, tax: c.tax, accounting: c.accounting }, update: { zus: c.zus, tax: c.tax, accounting: c.accounting } });
  }
  console.log(`costs: ${rows.length}`);
}

async function importProtocols() {
  const rows = readJson('protocols.json', []);
  for (const p of rows) {
    const zamowienieBytes = readFileIfExists(p.files?.zamowienie?.path);
    const odbiorczyBytes = readFileIfExists(p.files?.odbiorczy?.path);
    await prisma.protocol.upsert({
      where: { id: p.id },
      create: {
        id: p.id, month: p.month, year: p.year, orderNumber: p.orderNumber, totalHours: p.totalHours,
        amount: p.amount, generatedAt: p.generatedAt, exported: Boolean(p.exported), exportedAt: p.exportedAt,
        zamowienieFilename: p.files?.zamowienie?.filename || null, zamowienieBytes,
        odbiorczyFilename: p.files?.odbiorczy?.filename || null, odbiorczyBytes
      },
      update: {
        month: p.month, year: p.year, orderNumber: p.orderNumber, totalHours: p.totalHours,
        amount: p.amount, generatedAt: p.generatedAt, exported: Boolean(p.exported), exportedAt: p.exportedAt,
        zamowienieFilename: p.files?.zamowienie?.filename || null, zamowienieBytes,
        odbiorczyFilename: p.files?.odbiorczy?.filename || null, odbiorczyBytes
      }
    });
    for (const f of p.manualFiles || []) {
      const bytes = readFileIfExists(f.path);
      if (!bytes) continue;
      await prisma.manualFile.upsert({
        where: { id: f.id },
        create: { id: f.id, protocolId: p.id, filename: f.filename, bytes, uploadedAt: f.uploadedAt },
        update: { filename: f.filename, bytes, uploadedAt: f.uploadedAt }
      });
    }
  }
  console.log(`protocols: ${rows.length}`);
}

async function importProperties() {
  const rows = readJson('properties.json', []);
  for (const p of rows) {
    await prisma.property.upsert({
      where: { id: p.id },
      create: { id: p.id, name: p.name, type: p.type, address: p.address, maintenanceNote: p.maintenanceNote || '', maintenanceDate: p.maintenanceDate || null },
      update: { name: p.name, type: p.type, address: p.address, maintenanceNote: p.maintenanceNote || '', maintenanceDate: p.maintenanceDate || null }
    });
    if (p.tenant) {
      const t = p.tenant;
      await prisma.tenancy.upsert({
        where: { propertyId: p.id },
        create: {
          id: `${p.id}-tenancy`, propertyId: p.id, tenants: t.tenants || [], leaseStart: t.leaseStart || null,
          leaseEnd: t.leaseEnd || null, rentAmount: t.rentAmount || 0, utilityAdvance: t.utilityAdvance || 0,
          taxDue: t.taxDue || 0, deposit: t.deposit || 0, gateCode: t.gateCode || '', notes: t.notes || ''
        },
        update: {
          tenants: t.tenants || [], leaseStart: t.leaseStart || null, leaseEnd: t.leaseEnd || null,
          rentAmount: t.rentAmount || 0, utilityAdvance: t.utilityAdvance || 0, taxDue: t.taxDue || 0,
          deposit: t.deposit || 0, gateCode: t.gateCode || '', notes: t.notes || ''
        }
      });
    }
    for (const c of p.comments || []) {
      await prisma.propertyComment.upsert({
        where: { id: c.id },
        create: { id: c.id, propertyId: p.id, text: c.text, resolved: Boolean(c.resolved), createdAt: c.createdAt },
        update: { text: c.text, resolved: Boolean(c.resolved), createdAt: c.createdAt }
      });
    }
  }
  console.log(`properties: ${rows.length}`);
}

async function importPropertyExpenses() {
  const rows = readJson('propertyExpenses.json', []);
  for (const e of rows) {
    await prisma.propertyExpense.upsert({
      where: { id: e.id },
      create: { id: e.id, propertyId: e.propertyId, date: e.date, description: e.description || '', amount: e.amount || 0 },
      update: { propertyId: e.propertyId, date: e.date, description: e.description || '', amount: e.amount || 0 }
    });
  }
  console.log(`propertyExpenses: ${rows.length}`);
}

async function importVehicles() {
  const vehicles = readJson('vehicles.json', []);
  for (const v of vehicles) {
    await prisma.vehicle.upsert({
      where: { id: v.id },
      create: {
        id: v.id, name: v.name, type: v.type || 'car', year: v.year ?? null, engine: v.engine ?? null,
        fuelType: v.fuelType ?? null, power: v.power ?? null, plate: v.plate ?? null, vin: v.vin ?? null,
        mileage: v.mileage || 0, nextServiceDate: v.nextServiceDate ?? null, insuranceExpiryDate: v.insuranceExpiryDate ?? null,
        mileageUpdatedAt: v.mileageUpdatedAt ?? null, order: v.order ?? null
      },
      update: {
        name: v.name, type: v.type || 'car', year: v.year ?? null, engine: v.engine ?? null,
        fuelType: v.fuelType ?? null, power: v.power ?? null, plate: v.plate ?? null, vin: v.vin ?? null,
        mileage: v.mileage || 0, nextServiceDate: v.nextServiceDate ?? null, insuranceExpiryDate: v.insuranceExpiryDate ?? null,
        mileageUpdatedAt: v.mileageUpdatedAt ?? null, order: v.order ?? null
      }
    });
  }
  console.log(`vehicles: ${vehicles.length}`);

  const serviceLog = readJson('serviceLog.json', []);
  for (const s of serviceLog) {
    await prisma.serviceLogEntry.upsert({
      where: { id: s.id },
      create: { id: s.id, vehicleId: s.vehicleId, date: s.date, workshop: s.workshop || '', description: s.description || '', cost: s.cost || 0, mileage: s.mileage ?? null },
      update: { vehicleId: s.vehicleId, date: s.date, workshop: s.workshop || '', description: s.description || '', cost: s.cost || 0, mileage: s.mileage ?? null }
    });
  }
  console.log(`serviceLog: ${serviceLog.length}`);
}

async function importSubscriptions() {
  const rows = readJson('subscriptions.json', []);
  for (const s of rows) {
    await prisma.subscription.upsert({
      where: { id: s.id },
      create: { id: s.id, name: s.name, category: s.category || '', cost: s.cost || 0, billingCycle: s.billingCycle || 'monthly', nextRenewalDate: s.nextRenewalDate ?? null, autoRenew: Boolean(s.autoRenew), lastUsedDate: s.lastUsedDate ?? null },
      update: { name: s.name, category: s.category || '', cost: s.cost || 0, billingCycle: s.billingCycle || 'monthly', nextRenewalDate: s.nextRenewalDate ?? null, autoRenew: Boolean(s.autoRenew), lastUsedDate: s.lastUsedDate ?? null }
    });
  }
  console.log(`subscriptions: ${rows.length}`);
}

async function importTaxPayments() {
  const rows = readJson('taxPayments.json', []);
  for (const t of rows) {
    await prisma.taxPayment.upsert({
      where: { id: t.id },
      create: { id: t.id, period: t.period, amount: t.amount || 0, sienkiewicza: t.sienkiewicza ?? null, szczesliwa: t.szczesliwa ?? null, sienkiewiczaNote: t.sienkiewiczaNote || '', szczesliwaNote: t.szczesliwaNote || '', transferDate: t.transferDate ?? null },
      update: { period: t.period, amount: t.amount || 0, sienkiewicza: t.sienkiewicza ?? null, szczesliwa: t.szczesliwa ?? null, sienkiewiczaNote: t.sienkiewiczaNote || '', szczesliwaNote: t.szczesliwaNote || '', transferDate: t.transferDate ?? null }
    });
  }
  console.log(`taxPayments: ${rows.length}`);
}

async function importChores() {
  const rows = readJson('chores.json', []);
  for (const c of rows) {
    await prisma.chore.upsert({
      where: { id: c.id },
      create: { id: c.id, name: c.name, frequency: c.frequency || 'weekly', notes: c.notes || '', priority: c.priority || 'P2', propertyId: c.propertyId ?? null, vehicleId: c.vehicleId ?? null, completions: c.completions || [] },
      update: { name: c.name, frequency: c.frequency || 'weekly', notes: c.notes || '', priority: c.priority || 'P2', propertyId: c.propertyId ?? null, vehicleId: c.vehicleId ?? null, completions: c.completions || [] }
    });
  }
  console.log(`chores: ${rows.length}`);
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) {
    console.log('No data/ directory found - nothing to import.');
    return;
  }
  await importRates();
  await importBonuses();
  await importCosts();
  await importProtocols();
  await importProperties();
  await importPropertyExpenses();
  await importVehicles();
  await importSubscriptions();
  await importTaxPayments();
  await importChores();
  console.log('\nImport done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
