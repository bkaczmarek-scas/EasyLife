// Recznie wprowadzane koszty uzyskania przychodu (ZUS, podatek, ksiegowa) per miesiac.
// Jeden wpis na miesiac (klucz 'YYYY-MM'), edytowalny z sekcji Income w UI.
const prisma = require('../db/prisma');

async function getAll() {
  const rows = await prisma.cost.findMany();
  return rows.sort((a, b) => a.month.localeCompare(b.month));
}

async function upsert(month, { zus, tax, accounting }) {
  const data = { zus: Number(zus) || 0, tax: Number(tax) || 0, accounting: Number(accounting) || 0 };
  return prisma.cost.upsert({
    where: { month },
    create: { month, ...data },
    update: data
  });
}

module.exports = { getAll, upsert };
