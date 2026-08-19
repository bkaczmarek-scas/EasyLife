const test = require('node:test');
const assert = require('node:assert/strict');
const { recalculateMileage } = require('../src/services/vehiclesService');

test('recalculates mileage after deleting the service that supplied the current value', () => {
  const remaining = [
    { mileage: 92000 },
    { mileage: 87000 }
  ];
  assert.equal(recalculateMileage(95000, 95000, remaining), 92000);
});

test('resets mileage when the deleted service was the only mileage record', () => {
  assert.equal(recalculateMileage(95000, 95000, []), 0);
});

test('preserves a manual mileage correction higher than the deleted service', () => {
  assert.equal(recalculateMileage(110000, 95000, [{ mileage: 92000 }]), 110000);
});
