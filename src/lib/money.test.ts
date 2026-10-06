import assert from 'node:assert/strict';
import test from 'node:test';

import { eurToNad, formatMoney, nadToEur, vatOn } from './money.ts';

test('formats whole and fractional Namibian dollar values', () => {
  assert.equal(formatMoney(304), 'N$304');
  assert.equal(formatMoney(1250), 'N$1,250');
  assert.equal(formatMoney(304.5), 'N$304.50');
  assert.equal(formatMoney(304.567), 'N$304.57');
});

test('converts NAD to display-only euros at the configured fixed rate', () => {
  assert.equal(nadToEur(304), 15.2);
  assert.equal(eurToNad(15.2), 304);
  assert.match(formatMoney(304, 'eu'), /^15,20\s€$/u);
});

test('rounds VAT half up to cents', () => {
  assert.equal(vatOn(100), 15);
  assert.equal(vatOn(101.23), 15.18);
  assert.equal(vatOn(100, 20), 20);
});
