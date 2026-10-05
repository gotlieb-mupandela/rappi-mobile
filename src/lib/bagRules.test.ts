import assert from 'node:assert/strict';
import test from 'node:test';

import { linesAfterStockError } from './bagRules.ts';

const lines = [
  { code: '100009.100', size: 'S-M', qty: 4, name: 'Pro Goalkeeper Shirt' },
  { code: '100009.100', size: 'L-XL', qty: 2, name: 'Pro Goalkeeper Shirt' },
  { code: 'OTHER.1', size: 'M', qty: 3, name: 'Training Top' },
];

test('reduces only the named code and size', () => {
  const next = linesAfterStockError(lines, 'Only 1 in stock for 100009.100 (S-M)');
  assert.deepEqual(next.map((line) => line.qty), [1, 2, 3]);
});

test('removes every line for a product that is no longer sold', () => {
  const next = linesAfterStockError(lines, 'Product 100009.100 is no longer sold.');
  assert.deepEqual(next, [lines[2]]);
});

test('leaves the bag unchanged when no line can be identified', () => {
  assert.equal(linesAfterStockError(lines, 'Only 2 in stock.').length, 3);
});
