const fs = require('fs');
const path = require('path');
const { isPdfBase64, isMonth, isYear, isNonEmptyString } = require('../validation');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'protocols.json');
const FILES_DIR = path.join(DATA_DIR, 'protocols');

function pad2(n) {
  return String(n).padStart(2, '0');
}

function periodId(month, year) {
  return `${year}-${pad2(month)}`;
}

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILES_DIR)) fs.mkdirSync(FILES_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

function readAll() {
  ensureFile();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeAll(list) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2));
}

function getAll() {
  return readAll().sort((a, b) => b.id.localeCompare(a.id));
}

function getById(id) {
  return readAll().find(p => p.id === id);
}

function blankEntry(month, year) {
  return {
    id: periodId(month, year), month, year, orderNumber: null, totalHours: null,
    amount: null, generatedAt: null, exported: false, exportedAt: null, files: {}, manualFiles: []
  };
}

function recordGenerated(month, year, data, files) {
  ensureFile();
  const id = periodId(month, year);
  const zamowieniePath = path.join(FILES_DIR, `${id}-zamowienie.pdf`);
  const odbiorczyPath = path.join(FILES_DIR, `${id}-odbiorczy.pdf`);
  fs.writeFileSync(zamowieniePath, Buffer.from(files.zamowienie.bytes));
  fs.writeFileSync(odbiorczyPath, Buffer.from(files.odbiorczy.bytes));

  const list = readAll();
  const idx = list.findIndex(p => p.id === id);
  const existingManualFiles = idx !== -1 ? (list[idx].manualFiles || []) : [];
  const entry = {
    id, month, year, orderNumber: data.numerZamowienia, totalHours: data.totalHours,
    amount: data.kwota, generatedAt: new Date().toISOString(), exported: false, exportedAt: null,
    files: {
      zamowienie: { filename: files.zamowienie.filename, path: zamowieniePath },
      odbiorczy: { filename: files.odbiorczy.filename, path: odbiorczyPath }
    },
    manualFiles: existingManualFiles
  };

  if (idx === -1) list.push(entry);
  else list[idx] = entry;
  writeAll(list);
  return entry;
}

function markExported(id) {
  const list = readAll();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) throw new Error(`Protocol history entry not found: ${id}`);
  list[idx] = { ...list[idx], exported: true, exportedAt: new Date().toISOString() };
  writeAll(list);
  return list[idx];
}

function getFileBytes(id, kind) {
  const entry = getById(id);
  if (!entry) throw new Error(`Protocol history entry not found: ${id}`);
  const file = entry.files[kind];
  if (!file) throw new Error(`Unknown document kind: ${kind}`);
  return { bytes: fs.readFileSync(file.path), filename: file.filename };
}

function addManualFile(month, year, { filename, base64 }) {
  ensureFile();
  if (!isMonth(month) || !isYear(year)) throw new Error('Invalid period');
  if (!isNonEmptyString(filename) || !/\.pdf$/i.test(filename)) throw new Error('Only PDF files are supported');
  if (!isPdfBase64(base64)) throw new Error('Uploaded file is not a valid PDF');

  const id = periodId(month, year);
  const list = readAll();
  let idx = list.findIndex(p => p.id === id);
  if (idx === -1) {
    list.push(blankEntry(month, year));
    idx = list.length - 1;
  }
  if (!list[idx].manualFiles) list[idx].manualFiles = [];

  const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filePath = path.join(FILES_DIR, `${id}-manual-${fileId}.pdf`);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  list[idx].manualFiles.push({ id: fileId, filename: filename.trim(), path: filePath, uploadedAt: new Date().toISOString() });

  writeAll(list);
  return list[idx];
}

function getManualFileBytes(id, fileId) {
  const entry = getById(id);
  if (!entry) throw new Error(`Protocol history entry not found: ${id}`);
  const file = (entry.manualFiles || []).find(f => f.id === fileId);
  if (!file) throw new Error(`Manual file not found: ${fileId}`);
  return { bytes: fs.readFileSync(file.path), filename: file.filename };
}

function safeUnlink(filePath) {
  try { fs.unlinkSync(filePath); } catch (e) { /* already gone - fine */ }
}

function removeEntry(id) {
  const list = readAll();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) throw new Error(`Protocol history entry not found: ${id}`);
  const entry = list[idx];
  if (entry.files.zamowienie) safeUnlink(entry.files.zamowienie.path);
  if (entry.files.odbiorczy) safeUnlink(entry.files.odbiorczy.path);
  (entry.manualFiles || []).forEach(f => safeUnlink(f.path));
  list.splice(idx, 1);
  writeAll(list);
}

function removeFile(id, target) {
  const list = readAll();
  const idx = list.findIndex(p => p.id === id);
  if (idx === -1) throw new Error(`Protocol history entry not found: ${id}`);
  const entry = list[idx];

  if (target === 'zamowienie' || target === 'odbiorczy') {
    const file = entry.files[target];
    if (!file) throw new Error(`No ${target} file to delete`);
    safeUnlink(file.path);
    delete entry.files[target];
    if (!entry.files.zamowienie && !entry.files.odbiorczy) {
      entry.orderNumber = null; entry.totalHours = null; entry.amount = null;
      entry.generatedAt = null; entry.exported = false; entry.exportedAt = null;
    }
  } else {
    const manualIdx = (entry.manualFiles || []).findIndex(f => f.id === target);
    if (manualIdx === -1) throw new Error(`Manual file not found: ${target}`);
    safeUnlink(entry.manualFiles[manualIdx].path);
    entry.manualFiles.splice(manualIdx, 1);
  }

  const hasAnyFiles = Boolean(entry.files.zamowienie) || Boolean(entry.files.odbiorczy) || (entry.manualFiles || []).length > 0;
  if (!hasAnyFiles) list.splice(idx, 1);
  else list[idx] = entry;
  writeAll(list);
}

module.exports = {
  getAll, getById, recordGenerated, markExported, getFileBytes, periodId,
  addManualFile, getManualFileBytes, removeEntry, removeFile
};
