// Historia wygenerowanych protokolow. PDF-y (wygenerowane i recznie wgrane) trzymane sa jako
// bytea w Postgres (kolumny zamowienieBytes/odbiorczyBytes na Protocol, tabela ManualFile) -
// zastepuje to pliki na dysku z data/protocols/, ktore i tak nie przetrwalyby redeployu na
// Railway (efemeryczny filesystem kontenera).
const prisma = require('../db/prisma');

function pad2(n) {
  return String(n).padStart(2, '0');
}

function periodId(month, year) {
  return `${year}-${pad2(month)}`;
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toApiShape(protocol) {
  const files = {};
  if (protocol.zamowienieFilename) files.zamowienie = { filename: protocol.zamowienieFilename };
  if (protocol.odbiorczyFilename) files.odbiorczy = { filename: protocol.odbiorczyFilename };
  return {
    id: protocol.id,
    month: protocol.month,
    year: protocol.year,
    orderNumber: protocol.orderNumber,
    totalHours: protocol.totalHours,
    amount: protocol.amount,
    generatedAt: protocol.generatedAt,
    exported: protocol.exported,
    exportedAt: protocol.exportedAt,
    files,
    manualFiles: (protocol.manualFiles || []).map(f => ({ id: f.id, filename: f.filename, uploadedAt: f.uploadedAt }))
  };
}

async function getAll() {
  const rows = await prisma.protocol.findMany({ include: { manualFiles: true } });
  return rows.sort((a, b) => b.id.localeCompare(a.id)).map(toApiShape);
}

async function getById(id) {
  const protocol = await prisma.protocol.findUnique({ where: { id }, include: { manualFiles: true } });
  return protocol ? toApiShape(protocol) : undefined;
}

// Zapisuje PDF-y wygenerowanego okresu i zapisuje/aktualizuje metadane. Ponowne wygenerowanie dla
// tego samego okresu nadpisuje pliki i resetuje status eksportu - dane mogly sie zmienic (np. inna
// stawka), wiec stary status "wyeksportowano" bylby mylacy. Recznie wgrane pliki (manualFiles) sa
// zachowywane - relacja nie jest tu dotykana, wiec regeneracja protokolow ich nie kasuje.
// Wywolujacy powinien wczesniej sprawdzic getById() i ostrzec uzytkownika, jesli wpis juz
// istnieje - ta funkcja zawsze nadpisuje bez pytania (patrz endpoint /api/protocols/generate).
async function recordGenerated(month, year, data, files) {
  const id = periodId(month, year);
  const shared = {
    month, year,
    orderNumber: data.numerZamowienia, totalHours: data.totalHours, amount: data.kwota,
    generatedAt: new Date().toISOString(), exported: false, exportedAt: null,
    zamowienieFilename: files.zamowienie.filename, zamowienieBytes: Buffer.from(files.zamowienie.bytes),
    odbiorczyFilename: files.odbiorczy.filename, odbiorczyBytes: Buffer.from(files.odbiorczy.bytes)
  };
  const protocol = await prisma.protocol.upsert({
    where: { id },
    create: { id, ...shared },
    update: shared,
    include: { manualFiles: true }
  });
  return toApiShape(protocol);
}

async function markExported(id) {
  const existing = await prisma.protocol.findUnique({ where: { id } });
  if (!existing) throw new Error(`Protocol history entry not found: ${id}`);
  const protocol = await prisma.protocol.update({
    where: { id },
    data: { exported: true, exportedAt: new Date().toISOString() },
    include: { manualFiles: true }
  });
  return toApiShape(protocol);
}

async function getFileBytes(id, kind) {
  const protocol = await prisma.protocol.findUnique({ where: { id } });
  if (!protocol) throw new Error(`Protocol history entry not found: ${id}`);
  if (kind === 'zamowienie' && protocol.zamowienieBytes) {
    return { bytes: protocol.zamowienieBytes, filename: protocol.zamowienieFilename };
  }
  if (kind === 'odbiorczy' && protocol.odbiorczyBytes) {
    return { bytes: protocol.odbiorczyBytes, filename: protocol.odbiorczyFilename };
  }
  throw new Error(`Unknown document kind: ${kind}`);
}

// Reczne wgranie pliku (np. faktury zewnetrznej) dla danego okresu. Jesli wpis dla tego okresu
// jeszcze nie istnieje (bo protokoly nie byly generowane w aplikacji), tworzy pusty wpis - historia
// dziala wtedy jako archiwum dokumentow, nie tylko log generowania.
async function addManualFile(month, year, { filename, base64 }) {
  const id = periodId(month, year);
  await prisma.protocol.upsert({ where: { id }, create: { id, month, year }, update: {} });
  await prisma.manualFile.create({
    data: { id: newId(), protocolId: id, filename, bytes: Buffer.from(base64, 'base64'), uploadedAt: new Date().toISOString() }
  });
  return getById(id);
}

async function getManualFileBytes(id, fileId) {
  const manualFile = await prisma.manualFile.findUnique({ where: { id: fileId } });
  if (!manualFile || manualFile.protocolId !== id) throw new Error(`Manual file not found: ${fileId}`);
  return { bytes: manualFile.bytes, filename: manualFile.filename };
}

// Usuwa caly wpis: oba wygenerowane protokoly, wszystkie pliki wgrane recznie (kaskadowo), oraz
// sam rekord.
async function removeEntry(id) {
  const existing = await prisma.protocol.findUnique({ where: { id } });
  if (!existing) throw new Error(`Protocol history entry not found: ${id}`);
  await prisma.protocol.delete({ where: { id } });
}

// Usuwa pojedynczy plik z wpisu: 'zamowienie'/'odbiorczy' albo id pliku recznie wgranego.
// Jesli po usunieciu nie zostaje zaden plik, caly wpis znika (nie ma sensu trzymac pustego
// wiersza samych myslnikow). Jesli usunieto jeden z dwoch wygenerowanych protokolow, metadane
// generowania (numer zamowienia, kwota, status eksportu) sa czyszczone tylko gdy OBA znikna -
// pojedynczy brakujacy dokument to nadal ten sam "komplet", po prostu niepelny.
async function removeFile(id, target) {
  const protocol = await prisma.protocol.findUnique({ where: { id }, include: { manualFiles: true } });
  if (!protocol) throw new Error(`Protocol history entry not found: ${id}`);

  if (target === 'zamowienie' || target === 'odbiorczy') {
    const hasFile = target === 'zamowienie' ? protocol.zamowienieBytes != null : protocol.odbiorczyBytes != null;
    if (!hasFile) throw new Error(`No ${target} file to delete`);

    const clearedFields = target === 'zamowienie'
      ? { zamowienieFilename: null, zamowienieBytes: null }
      : { odbiorczyFilename: null, odbiorczyBytes: null };
    const otherHasFile = target === 'zamowienie' ? protocol.odbiorczyBytes != null : protocol.zamowienieBytes != null;
    const resetMeta = !otherHasFile
      ? { orderNumber: null, totalHours: null, amount: null, generatedAt: null, exported: false, exportedAt: null }
      : {};

    await prisma.protocol.update({ where: { id }, data: { ...clearedFields, ...resetMeta } });
  } else {
    const manualFile = protocol.manualFiles.find(f => f.id === target);
    if (!manualFile) throw new Error(`Manual file not found: ${target}`);
    await prisma.manualFile.delete({ where: { id: target } });
  }

  const updated = await prisma.protocol.findUnique({ where: { id }, include: { manualFiles: true } });
  const hasAnyFiles = updated.zamowienieBytes != null || updated.odbiorczyBytes != null || updated.manualFiles.length > 0;
  if (!hasAnyFiles) await prisma.protocol.delete({ where: { id } });
}

module.exports = {
  getAll, getById, recordGenerated, markExported, getFileBytes, periodId,
  addManualFile, getManualFileBytes, removeEntry, removeFile
};
