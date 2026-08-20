const prisma = require('../db/prisma');

async function getAll() {
  const rows = await prisma.bonus.findMany();
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

async function add({ name, date, amount }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return prisma.bonus.create({ data: { id, name, date, amount } });
}

async function update(id, { name, date, amount }) {
  const existing = await prisma.bonus.findUnique({ where: { id } });
  if (!existing) throw new Error(`Bonus not found: ${id}`);
  return prisma.bonus.update({ where: { id }, data: { name, date, amount } });
}

async function remove(id) {
  const existing = await prisma.bonus.findUnique({ where: { id } });
  if (!existing) throw new Error(`Bonus not found: ${id}`);
  await prisma.bonus.delete({ where: { id } });
}

module.exports = { getAll, add, update, remove };
