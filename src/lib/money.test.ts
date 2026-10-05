import assert from 'node:assert/strict';
import test from 'node:test';

import { formatMoney, vatOn } from './money.ts';

test('formats whole and fractional Namibian dollar values', () => {
  assert.equal(formatMoney(304), 'N$304');
  assert.equal(formatMoney(304.5), 'N$304.50');
  assert.equal(formatMoney(304.567), 'N$304.57');
});

test('rounds VAT half up to cents', () => {
  assert.equal(vatOn(100), 15);
  assert.equal(vatOn(101.23), 15.18);
});
