// Seeduje fikcyjne dane startowe (te same wartosci co dawne SEED_* w plikach data/*.json przed
// migracja do Postgresa) - potrzebne, bo Prisma/Postgres (w odroznieniu od starego kodu na fs) nie
// tworzy ich juz automatycznie przy pierwszym odczycie. Uzywane dla swiezej bazy (nowe wdrozenie
// demo na Railway, albo lokalny fresh start) - NIE odpalac na bazie z prawdziwymi danymi (upsert
// nadpisalby np. wpis "seed-p1", gdyby ktos przypadkiem uzywal tego samego id).
// Uzycie: npx prisma db seed (lub: node prisma/seed.js)
const prisma = require('../src/db/prisma');

async function main() {
  await prisma.rate.upsert({ where: { id: 'seed-2025-07' }, create: { id: 'seed-2025-07', from: '2025-07', rate: 90 }, update: {} });
  await prisma.rate.upsert({ where: { id: 'seed-2026-07' }, create: { id: 'seed-2026-07', from: '2026-07', rate: 100 }, update: {} });

  await prisma.bonus.upsert({
    where: { id: 'seed-dywidenda-2026-06' },
    create: { id: 'seed-dywidenda-2026-06', name: 'Dywidenda', date: '2026-06-30', amount: 9000 },
    update: {}
  });

  await prisma.property.upsert({
    where: { id: 'seed-p1' },
    create: {
      id: 'seed-p1', name: 'Rodzinny dom', type: 'primary', address: 'ul. Kwiatowa 12, Poznań',
      maintenanceNote: 'Bathroom renovation planned', maintenanceDate: '2026-09-20'
    },
    update: {}
  });
  await prisma.property.upsert({
    where: { id: 'seed-p2' },
    create: { id: 'seed-p2', name: 'Mieszkanie Przykładowe', type: 'rental', address: 'ul. Przykładowa 45/3, Poznań' },
    update: {}
  });
  await prisma.tenancy.upsert({
    where: { propertyId: 'seed-p2' },
    create: {
      id: 'seed-p2-tenancy', propertyId: 'seed-p2',
      tenants: [{ name: 'Anna Nowak', phone: '+48 601 234 567', email: 'anna.nowak@example.com' }],
      leaseStart: '2025-10-01', leaseEnd: '2026-09-30',
      rentAmount: 2400, utilityAdvance: 900, taxDue: 0, deposit: 2400
    },
    update: {}
  });

  await prisma.propertyExpense.upsert({
    where: { id: 'seed-pe1' },
    create: { id: 'seed-pe1', propertyId: 'seed-p1', date: '2026-02-10', description: 'Przykladowa naprawa', amount: 250 },
    update: {}
  });

  await prisma.vehicle.upsert({
    where: { id: 'seed-v1' },
    create: {
      id: 'seed-v1', name: 'Škoda Octavia', type: 'car', year: 2019, engine: '2.0', fuelType: 'diesel', power: 150,
      plate: 'PO 12345', vin: 'TMBJJ7NE0N0123456', mileage: 68200, nextServiceDate: '2026-09-02',
      insuranceExpiryDate: '2027-01-10', mileageUpdatedAt: '2026-08-10T09:00:00.000Z'
    },
    update: {}
  });
  await prisma.vehicle.upsert({
    where: { id: 'seed-v2' },
    create: {
      id: 'seed-v2', name: 'VW Transporter', type: 'car', year: 2017, engine: '2.0', fuelType: 'diesel', power: 140,
      plate: 'PO 98765', vin: 'WV1ZZZ7HZKH123456', mileage: 142500, nextServiceDate: '2026-10-15',
      insuranceExpiryDate: '2026-09-03', mileageUpdatedAt: '2026-08-05T09:00:00.000Z'
    },
    update: {}
  });

  await prisma.serviceLogEntry.upsert({
    where: { id: 'seed-s1' },
    create: { id: 'seed-s1', vehicleId: 'seed-v1', date: '2026-03-04', workshop: 'AutoSerwis Przykładowy', description: 'Full synthetic oil + filter', cost: 420, mileage: 65000 },
    update: {}
  });
  await prisma.serviceLogEntry.upsert({
    where: { id: 'seed-s2' },
    create: { id: 'seed-s2', vehicleId: 'seed-v1', date: '2025-09-11', workshop: 'AutoSerwis Przykładowy', description: 'Front brake pads and discs', cost: 980, mileage: 58000 },
    update: {}
  });
  await prisma.serviceLogEntry.upsert({
    where: { id: 'seed-s3' },
    create: { id: 'seed-s3', vehicleId: 'seed-v2', date: '2026-01-20', workshop: 'Stacja Kontroli Pojazdów', description: 'Annual technical inspection', cost: 150, mileage: 138000 },
    update: {}
  });

  const subscriptions = [
    { id: 'seed-s1', name: 'Netflix', category: 'Streaming', cost: 43, billingCycle: 'monthly', nextRenewalDate: '2026-09-05', autoRenew: true, lastUsedDate: '2026-08-17' },
    { id: 'seed-s2', name: 'Spotify', category: 'Streaming', cost: 23.99, billingCycle: 'monthly', nextRenewalDate: '2026-08-22', autoRenew: true, lastUsedDate: '2026-08-18' },
    { id: 'seed-s3', name: 'City Gym', category: 'Gym', cost: 149, billingCycle: 'monthly', nextRenewalDate: '2026-09-01', autoRenew: true, lastUsedDate: '2026-08-12' },
    { id: 'seed-s4', name: 'iCloud+', category: 'Software', cost: 299, billingCycle: 'yearly', nextRenewalDate: '2027-02-14', autoRenew: true, lastUsedDate: '2026-08-16' },
    { id: 'seed-s5', name: 'Disney+', category: 'Streaming', cost: 30, billingCycle: 'monthly', nextRenewalDate: '2026-09-10', autoRenew: true, lastUsedDate: '2026-06-05' }
  ];
  for (const s of subscriptions) {
    await prisma.subscription.upsert({ where: { id: s.id }, create: s, update: {} });
  }

  await prisma.taxPayment.upsert({
    where: { id: 'seed-tx1' },
    create: { id: 'seed-tx1', period: '2026-01', amount: 250, sienkiewicza: 130, szczesliwa: 120, transferDate: '2026-02-03' },
    update: {}
  });

  const chores = [
    { id: 'seed-ch1', name: 'Replace HVAC filter', frequency: 'monthly', priority: 'P2' },
    { id: 'seed-ch2', name: 'Water plants', frequency: 'weekly', priority: 'P3' },
    { id: 'seed-ch3', name: 'Take out recycling', frequency: 'weekly', priority: 'P3' },
    { id: 'seed-ch4', name: 'Mow the lawn', frequency: 'weekly', priority: 'P2' }
  ];
  for (const c of chores) {
    await prisma.chore.upsert({ where: { id: c.id }, create: c, update: {} });
  }

  console.log('Seed done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
