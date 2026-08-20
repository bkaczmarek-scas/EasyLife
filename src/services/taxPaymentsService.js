// Plac. podatku ryczaltowego od najmu (Sienkiewicza + Szczesliwa) - per-property split kwoty
// (sienkiewicza/szczesliwa) sa opcjonalne, bo nie dla kazdego miesiaca jest potwierdzony podzial
// laczej wplaty (patrz "amount" - to zawsze prawdziwa, przelana suma, niezaleznie od tego czy
// podzial jest znany).
const prisma = require('../db/prisma');

function toNullableNumber(v) {
  return v === null || v === undefined || v === '' ? null : Number(v);
}

async function getAll() {
  const rows = await prisma.taxPayment.findMany();
  return rows.sort((a, b) => a.period.localeCompare(b.period));
}

async function add({ period, amount, sienkiewicza, szczesliwa, sienkiewiczaNote, szczesliwaNote, transferDate }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return prisma.taxPayment.create({
    data: {
      id, period, amount: Number(amount) || 0,
      sienkiewicza: toNullableNumber(sienkiewicza), szczesliwa: toNullableNumber(szczesliwa),
      sienkiewiczaNote: sienkiewiczaNote || '', szczesliwaNote: szczesliwaNote || '',
      transferDate: transferDate || null
    }
  });
}

async function update(id, { period, amount, sienkiewicza, szczesliwa, sienkiewiczaNote, szczesliwaNote, transferDate }) {
  const existing = await prisma.taxPayment.findUnique({ where: { id } });
  if (!existing) throw new Error(`Tax payment not found: ${id}`);
  return prisma.taxPayment.update({
    where: { id },
    data: {
      period, amount: Number(amount) || 0,
      sienkiewicza: toNullableNumber(sienkiewicza), szczesliwa: toNullableNumber(szczesliwa),
      sienkiewiczaNote: sienkiewiczaNote || '', szczesliwaNote: szczesliwaNote || '',
      transferDate: transferDate || null
    }
  });
}

async function remove(id) {
  const existing = await prisma.taxPayment.findUnique({ where: { id } });
  if (!existing) throw new Error(`Tax payment not found: ${id}`);
  await prisma.taxPayment.delete({ where: { id } });
}

module.exports = { getAll, add, update, remove };
