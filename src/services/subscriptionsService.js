// Aktywne subskrypcje (Netflix, Spotify, silownia...). Prosty CRUD na tabeli Subscription, ten
// sam wzorzec co vehicles/properties - jedna niezalezna kolekcja bez zagniezdzonych podobiektow.
const prisma = require('../db/prisma');

async function getAll() {
  const rows = await prisma.subscription.findMany();
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

async function add({ name, category, cost, billingCycle, nextRenewalDate, autoRenew, lastUsedDate }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return prisma.subscription.create({
    data: {
      id, name, category: category || '',
      cost: Number(cost) || 0, billingCycle: billingCycle === 'yearly' ? 'yearly' : 'monthly',
      nextRenewalDate: nextRenewalDate || null, autoRenew: Boolean(autoRenew), lastUsedDate: lastUsedDate || null
    }
  });
}

async function update(id, { name, category, cost, billingCycle, nextRenewalDate, autoRenew, lastUsedDate }) {
  const existing = await prisma.subscription.findUnique({ where: { id } });
  if (!existing) throw new Error(`Subscription not found: ${id}`);
  return prisma.subscription.update({
    where: { id },
    data: {
      name, category: category || '',
      cost: Number(cost) || 0, billingCycle: billingCycle === 'yearly' ? 'yearly' : 'monthly',
      nextRenewalDate: nextRenewalDate || null, autoRenew: Boolean(autoRenew), lastUsedDate: lastUsedDate || null
    }
  });
}

async function remove(id) {
  const existing = await prisma.subscription.findUnique({ where: { id } });
  if (!existing) throw new Error(`Subscription not found: ${id}`);
  await prisma.subscription.delete({ where: { id } });
}

module.exports = { getAll, add, update, remove };
