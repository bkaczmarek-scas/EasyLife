// Nieruchomosci + najemcy. Jedna nieruchomosc ma co najwyzej jednego najemce na raz (tabela
// Tenancy, relacja 1:1 przez unique propertyId) - dane najemcy (mogacego byc kilkoma osobami,
// pole tenants) sa zwracane zagniezdzone w property.tenant, tak jak w oryginalnym JSON, zeby nie
// trzeba bylo zmieniac frontowego CRUD z jednego formularza. Komentarze to osobna tabela 1:N.
// Usuniecie property kasuje kaskadowo jego tenancy i comments (byly zagniezdzone w tym samym
// obiekcie JSON).
const prisma = require('../db/prisma');

const COMMENTS_INCLUDE = { orderBy: { createdAt: 'asc' } };

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeTenant(type, tenant) {
  if (type !== 'rental' || !tenant) return null;
  const tenants = (tenant.tenants || [])
    .filter(t => t && t.name)
    .map(t => ({ name: t.name, phone: t.phone || '', email: t.email || '' }));
  if (!tenants.length) return null;
  return {
    tenants,
    leaseStart: tenant.leaseStart || null,
    leaseEnd: tenant.leaseEnd || null,
    rentAmount: Number(tenant.rentAmount) || 0,
    utilityAdvance: Number(tenant.utilityAdvance) || 0,
    taxDue: Number(tenant.taxDue) || 0,
    deposit: Number(tenant.deposit) || 0,
    gateCode: tenant.gateCode || '',
    notes: tenant.notes || ''
  };
}

function toApiShape(property) {
  return {
    id: property.id,
    name: property.name,
    type: property.type,
    address: property.address,
    tenant: property.tenancy ? {
      tenants: property.tenancy.tenants,
      leaseStart: property.tenancy.leaseStart,
      leaseEnd: property.tenancy.leaseEnd,
      rentAmount: property.tenancy.rentAmount,
      utilityAdvance: property.tenancy.utilityAdvance,
      taxDue: property.tenancy.taxDue,
      deposit: property.tenancy.deposit,
      gateCode: property.tenancy.gateCode,
      notes: property.tenancy.notes
    } : null,
    comments: (property.comments || []).map(c => ({ id: c.id, text: c.text, resolved: c.resolved, createdAt: c.createdAt })),
    maintenanceNote: property.maintenanceNote,
    maintenanceDate: property.maintenanceDate
  };
}

async function getFullById(id) {
  return prisma.property.findUnique({
    where: { id },
    include: { tenancy: true, comments: COMMENTS_INCLUDE }
  });
}

async function getAll() {
  const rows = await prisma.property.findMany({ include: { tenancy: true, comments: COMMENTS_INCLUDE } });
  return rows.sort((a, b) => a.name.localeCompare(b.name)).map(toApiShape);
}

async function add({ name, type, address, tenant, maintenanceNote, maintenanceDate }) {
  const normalized = normalizeTenant(type, tenant);
  const property = await prisma.property.create({
    data: {
      id: newId(), name, type: type === 'rental' ? 'rental' : 'primary', address,
      maintenanceNote: maintenanceNote || '', maintenanceDate: maintenanceDate || null,
      tenancy: normalized ? { create: { id: newId(), ...normalized } } : undefined
    },
    include: { tenancy: true, comments: COMMENTS_INCLUDE }
  });
  return toApiShape(property);
}

async function update(id, { name, type, address, tenant, maintenanceNote, maintenanceDate }) {
  const existing = await getFullById(id);
  if (!existing) throw new Error(`Property not found: ${id}`);
  const normalized = normalizeTenant(type, tenant);

  await prisma.$transaction(async (tx) => {
    await tx.property.update({
      where: { id },
      data: {
        name, type: type === 'rental' ? 'rental' : 'primary', address,
        maintenanceNote: maintenanceNote || '', maintenanceDate: maintenanceDate || null
      }
    });
    if (normalized) {
      await tx.tenancy.upsert({
        where: { propertyId: id },
        create: { id: newId(), propertyId: id, ...normalized },
        update: normalized
      });
    } else if (existing.tenancy) {
      await tx.tenancy.delete({ where: { propertyId: id } });
    }
  });

  return toApiShape(await getFullById(id));
}

async function remove(id) {
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) throw new Error(`Property not found: ${id}`);
  await prisma.property.delete({ where: { id } });
}

async function addComment(id, text) {
  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) throw new Error(`Property not found: ${id}`);
  await prisma.propertyComment.create({
    data: { id: newId(), propertyId: id, text, resolved: false, createdAt: new Date().toISOString() }
  });
  return toApiShape(await getFullById(id));
}

async function toggleCommentResolved(id, commentId) {
  const comment = await prisma.propertyComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.propertyId !== id) throw new Error(`Comment not found: ${commentId}`);
  await prisma.propertyComment.update({ where: { id: commentId }, data: { resolved: !comment.resolved } });
  return toApiShape(await getFullById(id));
}

async function removeComment(id, commentId) {
  const comment = await prisma.propertyComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.propertyId !== id) throw new Error(`Comment not found: ${commentId}`);
  await prisma.propertyComment.delete({ where: { id: commentId } });
  return toApiShape(await getFullById(id));
}

module.exports = { getAll, add, update, remove, addComment, removeComment, toggleCommentResolved };
