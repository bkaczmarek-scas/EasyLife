// Cykliczne domowe obowiazki. Kazdy chore trzyma surowa liste dat ukonczenia (completions, kolumna
// text[] w Postgres); streak i "czy zrobione w tym okresie" sa liczone tutaj (nie w JS klienta),
// zeby logika okresow (dzien/tydzien/miesiac) miala jedno zrodlo prawdy.
const prisma = require('../db/prisma');

const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly', 'once'];
const VALID_PRIORITIES = ['P1', 'P2', 'P3'];

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Every frequency collapses a date to a single integer bucket, so "same period" is just equality
// and "previous period" is just -1 - no separate calendar-week/month-boundary code per frequency.
function periodIndex(dateStr, frequency) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (frequency === 'monthly') return d.getFullYear() * 12 + d.getMonth();
  const days = Math.floor(d.getTime() / 86400000);
  if (frequency === 'weekly') return Math.floor(days / 7);
  return days; // daily
}

// "once" tasks have no recurring period - done means "completed at all", no streak to track.
function isDoneThisPeriod(completions, frequency) {
  if (frequency === 'once') return completions.length > 0;
  const current = periodIndex(todayStr(), frequency);
  return completions.some(c => periodIndex(c, frequency) === current);
}

function computeStreak(completions, frequency) {
  if (frequency === 'once') return 0;
  if (!completions.length) return 0;
  const periods = [...new Set(completions.map(c => periodIndex(c, frequency)))].sort((a, b) => b - a);
  const current = periodIndex(todayStr(), frequency);
  // A streak only counts if it's still "alive" - most recent completion is this period or the last one.
  if (periods[0] !== current && periods[0] !== current - 1) return 0;
  let streak = 0;
  let expected = periods[0];
  for (const p of periods) {
    if (p !== expected) break;
    streak++;
    expected--;
  }
  return streak;
}

function decorate(chore) {
  return {
    ...chore,
    doneThisPeriod: isDoneThisPeriod(chore.completions || [], chore.frequency),
    streak: computeStreak(chore.completions || [], chore.frequency)
  };
}

async function getAll() {
  const rows = await prisma.chore.findMany();
  return rows.sort((a, b) => a.name.localeCompare(b.name)).map(decorate);
}

async function add({ name, frequency, notes, priority, propertyId, vehicleId }) {
  const entry = await prisma.chore.create({
    data: {
      id: newId(), name, frequency: VALID_FREQUENCIES.includes(frequency) ? frequency : 'weekly',
      notes: notes || '', priority: VALID_PRIORITIES.includes(priority) ? priority : 'P2',
      propertyId: propertyId || null, vehicleId: vehicleId || null
    }
  });
  return decorate(entry);
}

async function update(id, { name, frequency, notes, priority, propertyId, vehicleId }) {
  const existing = await prisma.chore.findUnique({ where: { id } });
  if (!existing) throw new Error(`Chore not found: ${id}`);
  const entry = await prisma.chore.update({
    where: { id },
    data: {
      name, frequency: VALID_FREQUENCIES.includes(frequency) ? frequency : 'weekly',
      notes: notes || '', priority: VALID_PRIORITIES.includes(priority) ? priority : 'P2',
      propertyId: propertyId || null, vehicleId: vehicleId || null
    }
  });
  return decorate(entry);
}

async function remove(id) {
  const existing = await prisma.chore.findUnique({ where: { id } });
  if (!existing) throw new Error(`Chore not found: ${id}`);
  await prisma.chore.delete({ where: { id } });
}

async function toggleComplete(id) {
  const chore = await prisma.chore.findUnique({ where: { id } });
  if (!chore) throw new Error(`Chore not found: ${id}`);

  let completions;
  if (chore.frequency === 'once') {
    // No period to compare against - just flip between "never done" and "done today".
    completions = (chore.completions || []).length ? [] : [todayStr()];
  } else {
    const current = periodIndex(todayStr(), chore.frequency);
    const hasThisPeriod = (chore.completions || []).some(c => periodIndex(c, chore.frequency) === current);
    completions = hasThisPeriod
      ? chore.completions.filter(c => periodIndex(c, chore.frequency) !== current)
      : [...(chore.completions || []), todayStr()];
  }

  const entry = await prisma.chore.update({ where: { id }, data: { completions } });
  return decorate(entry);
}

module.exports = { getAll, add, update, remove, toggleComplete };
