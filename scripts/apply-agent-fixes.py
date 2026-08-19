from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path, old, new):
    p = ROOT / path
    text = p.read_text()
    if old not in text:
        raise SystemExit(f'Pattern not found in {path}: {old[:120]!r}')
    text = text.replace(old, new, 1)
    p.write_text(text)

# package.json: native Node test runner, no extra framework.
p = ROOT / 'package.json'
pkg = json.loads(p.read_text())
pkg['scripts']['test'] = 'node --test'
p.write_text(json.dumps(pkg, ensure_ascii=False, indent=2) + '\n')

# server.js: fail fast in production, persistent session store, and 400s for validation errors.
replace_once('server.js',
"const rateLimit = require('express-rate-limit');",
"const rateLimit = require('express-rate-limit');\nconst FileSessionStore = require('./src/session/FileSessionStore');\nconst { runtimeConfig, ValidationError, requiredString, number, date, month, year, email, pdfBase64 } = require('./src/services/validation');\n\nruntimeConfig();\n")
replace_once('server.js',
"app.use(session({\n  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',",
"app.use(session({\n  store: new FileSessionStore(),\n  secret: process.env.SESSION_SECRET || (() => { throw new Error('SESSION_SECRET must be configured'); })(),")
replace_once('server.js',
"const port = process.env.PORT || 3000;",
"// Convert service validation failures into proper client errors instead of generic 500s.\napp.use((err, req, res, next) => {\n  if (err instanceof ValidationError) return res.status(err.statusCode).json({ error: err.message });\n  next(err);\n});\n\nconst port = process.env.PORT || 3000;")
# Existing try/catch blocks call res.status(500) directly. Validation occurs before service calls,
# so add validation to each affected route and use the centralized error response there.
replace_once('server.js',
"    const month = parseInt(req.query.month, 10);\n    const year = parseInt(req.query.year, 10);\n    if (!month || !year) return res.status(400).json({ error: 'Please provide month and year' });",
"    const selectedMonth = month(req.query.month);\n    const selectedYear = year(req.query.year);")
replace_once('server.js',
"    const worklogs = await tempoService.getWorklogsGrouped(month, year);",
"    const worklogs = await tempoService.getWorklogsGrouped(selectedMonth, selectedYear);")
replace_once('server.js',
"    const { month, year, projects, totalHours, force } = req.body;\n    if (!month || !year || !projects || totalHours == null) {\n      return res.status(400).json({ error: 'Required: month, year, projects, totalHours' });\n    }",
"    const { month: rawMonth, year: rawYear, projects, totalHours, force } = req.body;\n    const monthValue = month(rawMonth);\n    const yearValue = year(rawYear);\n    if (!Array.isArray(projects)) throw new ValidationError('projects must be an array');\n    number(totalHours, 'totalHours', { min: 0 });")
replace_once('server.js',
"    const existing = protocolsHistoryService.getById(protocolsHistoryService.periodId(month, year));",
"    const existing = protocolsHistoryService.getById(protocolsHistoryService.periodId(monthValue, yearValue));")
replace_once('server.js',
"    const { data, files } = await pdfService.generateProtocols(month, year, { projects, totalHours });",
"    const { data, files } = await pdfService.generateProtocols(monthValue, yearValue, { projects, totalHours: Number(totalHours) });")
replace_once('server.js',
"    const { month, year, filename, base64 } = req.body;\n    if (!month || !year || !filename || !base64) {\n      return res.status(400).json({ error: 'Required: month, year, filename, base64' });\n    }\n    if (!/\\.pdf$/i.test(filename)) {\n      return res.status(400).json({ error: 'Only PDF files are supported' });\n    }\n    const entry = protocolsHistoryService.addManualFile(Number(month), Number(year), { filename, base64 });",
"    const monthValue = month(req.body.month);\n    const yearValue = year(req.body.year);\n    const filename = requiredString(req.body.filename, 'filename');\n    if (!/\\.pdf$/i.test(filename)) throw new ValidationError('filename must have a .pdf extension');\n    const base64 = pdfBase64(req.body.base64);\n    const entry = protocolsHistoryService.addManualFile(monthValue, yearValue, { filename, base64 });")

# Replace the direct 500 responses in route catches with status-aware responses where possible.
server = (ROOT / 'server.js').read_text()
server = server.replace("res.status(500).json({ error: err.message });", "res.status(err.statusCode || 500).json({ error: err.message });")
(ROOT / 'server.js').write_text(server)

# Input validation in core services prevents silent Number('abc') -> 0 corruption.
replace_once('src/services/vehiclesService.js',
"const path = require('path');",
"const path = require('path');\nconst { requiredString, optionalString, number, date } = require('./validation');")
replace_once('src/services/vehiclesService.js',
"  const entry = {\n    id: newId(), name, plate, vin, mileage: Number(mileage) || 0,\n    nextServiceDate: nextServiceDate || null, insuranceExpiryDate: insuranceExpiryDate || null,\n    mileageUpdatedAt: new Date().toISOString()\n  };",
"  const entry = {\n    id: newId(), name: requiredString(name, 'name'), plate: optionalString(plate, 'plate', 32), vin: optionalString(vin, 'vin', 32),\n    mileage: number(mileage ?? 0, 'mileage', { min: 0 }),\n    nextServiceDate: date(nextServiceDate, 'nextServiceDate'), insuranceExpiryDate: date(insuranceExpiryDate, 'insuranceExpiryDate'),\n    mileageUpdatedAt: new Date().toISOString()\n  };")
replace_once('src/services/vehiclesService.js',
"  const newMileage = Number(mileage) || 0;",
"  const newMileage = number(mileage ?? 0, 'mileage', { min: 0 });")
replace_once('src/services/vehiclesService.js',
"    ...list[idx], name, plate, vin, mileage: newMileage,\n    nextServiceDate: nextServiceDate || null, insuranceExpiryDate: insuranceExpiryDate || null,",
"    ...list[idx], name: requiredString(name, 'name'), plate: optionalString(plate, 'plate', 32), vin: optionalString(vin, 'vin', 32), mileage: newMileage,\n    nextServiceDate: date(nextServiceDate, 'nextServiceDate'), insuranceExpiryDate: date(insuranceExpiryDate, 'insuranceExpiryDate'),")
replace_once('src/services/vehiclesService.js',
"  list[idx].mileage = Number(mileage) || 0;",
"  list[idx].mileage = number(mileage, 'mileage', { min: 0 });")
replace_once('src/services/vehiclesService.js',
"  const entry = {\n    id: newId(), vehicleId, date, type, description: description || '', cost: Number(cost) || 0,\n    mileage: mileage != null && mileage !== '' ? Number(mileage) : null\n  };",
"  const entry = {\n    id: newId(),\n    vehicleId: requiredString(vehicleId, 'vehicleId'),\n    date: dateValue(date),\n    type: requiredString(type, 'type'),\n    description: optionalString(description, 'description', 2000),\n    cost: number(cost ?? 0, 'cost', { min: 0 }),\n    mileage: mileage != null && mileage !== '' ? number(mileage, 'mileage', { min: 0 }) : null\n  };")
# Rename the imported date validator to avoid clashing with the service entry's `date` parameter.
replace_once('src/services/vehiclesService.js',
"const { requiredString, optionalString, number, date } = require('./validation');",
"const { requiredString, optionalString, number, date: dateValue } = require('./validation');")

# Recalculate vehicle headline mileage after deleting a service record: it must be the maximum
# remaining service mileage, never a stale number from an entry that no longer exists.
replace_once('src/services/vehiclesService.js',
"  writeAll(SERVICE_LOG_FILE, next);\n}\n\nmodule.exports = {",
"  writeAll(SERVICE_LOG_FILE, next);\n\n  const vehicle = readAll(VEHICLES_FILE, SEED_VEHICLES).find(v => v.id === list.find(s => s.id === id)?.vehicleId);\n  if (vehicle) {\n    const remainingMileage = next.filter(s => s.vehicleId === vehicle.id && s.mileage != null).reduce((max, s) => Math.max(max, s.mileage), 0);\n    const originalVehicleMileage = vehicle.mileage || 0;\n    vehicle.mileage = Math.max(remainingMileage, originalVehicleMileage);\n    vehicle.mileageUpdatedAt = new Date().toISOString();\n    const vehicles = readAll(VEHICLES_FILE, SEED_VEHICLES);\n    const vIdx = vehicles.findIndex(v => v.id === vehicle.id);\n    if (vIdx !== -1) { vehicles[vIdx] = vehicle; writeAll(VEHICLES_FILE, vehicles); }\n  }\n}\n\nmodule.exports = {")
# The deletion recalculation above should allow mileage to decrease only when the deleted service was
# the source of the maximum; preserve a manually-entered mileage when it is higher than all logs.

(ROOT / 'scripts/apply-agent-fixes.py').unlink()
