// Wydatki per nieruchomosc (naprawy, oplaty jednorazowe itp.) - osobna tabela od Property, bo
// lista wydatkow rosnie w czasie i nie powinna byc zagniezdzona w rekordzie property (to samo
// podejscie co ServiceLogEntry dla pojazdow). propertyId to luzne odwolanie bez wymuszanego FK -
// usuniecie nieruchomosci nie kasuje jej wydatkow (tak samo jak przed migracja z JSON).
const prisma = require('../db/prisma');

async function getAll(propertyId) {
  const rows = await prisma.propertyExpense.findMany(propertyId ? { where: { propertyId } } : undefined);
  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

async function add({ propertyId, date, description, amount }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return prisma.propertyExpense.create({
    data: { id, propertyId, date, description: description || '', amount: Number(amount) || 0 }
  });
}

async function update(id, { date, description, amount }) {
  const existing = await prisma.propertyExpense.findUnique({ where: { id } });
  if (!existing) throw new Error(`Expense not found: ${id}`);
  return prisma.propertyExpense.update({
    where: { id },
    data: { date, description: description || '', amount: Number(amount) || 0 }
  });
}

async function remove(id) {
  const existing = await prisma.propertyExpense.findUnique({ where: { id } });
  if (!existing) throw new Error(`Expense not found: ${id}`);
  await prisma.propertyExpense.delete({ where: { id } });
}

module.exports = { getAll, add, update, remove };
