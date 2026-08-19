const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  ValidationError,
  number,
  date,
  pdfBase64,
  runtimeConfig
} = require('../src/services/validation');
const FileSessionStore = require('../src/session/FileSessionStore');

test('invalid numeric input is rejected instead of becoming zero', () => {
  assert.throws(() => number('abc', 'amount', { min: 0 }), ValidationError);
  assert.equal(number('42.5', 'amount', { min: 0 }), 42.5);
});

test('dates are validated', () => {
  assert.equal(date('2026-08-19', 'date', { required: true }), '2026-08-19');
  assert.throws(() => date('2026-02-31', 'date', { required: true }), ValidationError);
});

test('PDF uploads must contain a real PDF header', () => {
  const valid = Buffer.from('%PDF-1.7\n').toString('base64');
  assert.equal(pdfBase64(valid), valid);
  assert.throws(() => pdfBase64(Buffer.from('not a pdf').toString('base64')), ValidationError);
});

test('production requires a strong session secret', () => {
  assert.throws(() => runtimeConfig({ NODE_ENV: 'production', SESSION_SECRET: 'short' }));
  assert.doesNotThrow(() => runtimeConfig({ NODE_ENV: 'production', SESSION_SECRET: '12345678901234567890123456789012' }));
});

test('file session store persists, touches and destroys sessions', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'easylife-session-'));
  const file = path.join(dir, 'sessions.json');
  try {
    const first = new FileSessionStore(file);
    await new Promise((resolve, reject) => first.set('sid', { authenticated: true, cookie: { maxAge: 60000 } }, err => err ? reject(err) : resolve()));
    const second = new FileSessionStore(file);
    const loaded = await new Promise((resolve, reject) => second.get('sid', (err, value) => err ? reject(err) : resolve(value)));
    assert.equal(loaded.authenticated, true);
    await new Promise((resolve, reject) => second.destroy('sid', err => err ? reject(err) : resolve()));
    const missing = await new Promise((resolve, reject) => second.get('sid', (err, value) => err ? reject(err) : resolve(value)));
    assert.equal(missing, null);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('deleting the latest service recalculates vehicle mileage', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'easylife-vehicle-'));
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  const originalCwd = process.cwd();
  process.chdir(dir);
  try {
    delete require.cache[require.resolve('../src/services/vehiclesService')];
    const service = require('../src/services/vehiclesService');
    const vehicle = service.addVehicle({ name: 'Test car', mileage: 100000 });
    service.addServiceEntry({ vehicleId: vehicle.id, date: '2026-08-01', type: 'Service', mileage: 101000 });
    const latest = service.addServiceEntry({ vehicleId: vehicle.id, date: '2026-08-10', type: 'Service', mileage: 102000 });
    assert.equal(service.getVehicles().find(v => v.id === vehicle.id).mileage, 102000);
    service.removeServiceEntry(latest.id);
    assert.equal(service.getVehicles().find(v => v.id === vehicle.id).mileage, 101000);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
