// Historia stawek godzinowych — jedyne zrodlo prawdy uzywane zarowno przy generowaniu
// protokolow (kwota = godziny x stawka obowiazujaca w danym miesiacu), jak i w sekcji Rates
// w UI (przez /api/rates). Przechowywane w Postgres (tabela Rate), edytowalne z poziomu UI.
const prisma = require('../db/prisma');

async function getAll() {
  const rows = await prisma.rate.findMany();
  return rows.sort((a, b) => a.from.localeCompare(b.from));
}

async function getRateForMonth(year, month) {
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const sorted = await getAll();
  if (!sorted.length) return 0;
  let applicable = sorted[0].rate;
  for (const entry of sorted) {
    if (entry.from <= key) applicable = entry.rate; else break;
  }
  return applicable;
}

async function add({ from, rate }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return prisma.rate.create({ data: { id, from, rate } });
}

async function update(id, { from, rate }) {
  const existing = await prisma.rate.findUnique({ where: { id } });
  if (!existing) throw new Error(`Rate not found: ${id}`);
  return prisma.rate.update({ where: { id }, data: { from, rate } });
}

async function remove(id) {
  const count = await prisma.rate.count();
  if (count <= 1) throw new Error('At least one rate entry is required');
  const existing = await prisma.rate.findUnique({ where: { id } });
  if (!existing) throw new Error(`Rate not found: ${id}`);
  await prisma.rate.delete({ where: { id } });
}

module.exports = { getAll, getRateForMonth, add, update, remove };
