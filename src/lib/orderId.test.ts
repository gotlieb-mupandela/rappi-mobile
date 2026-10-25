import assert from 'node:assert/strict';
import test from 'node:test';

import { isOrderId } from './orderId.ts';

const ORDER_ID = '1b454d71-23eb-42e9-8fe8-fddc167b5bcd';

test('accepts a UUID order id', () => {
  assert.equal(isOrderId(ORDER_ID), true);
  assert.equal(isOrderId(ORDER_ID.toUpperCase()), true);
});

test('rejects anything that is not a UUID order id', () => {
  const rejected = [
    '',
    '12345',
    12345,
    ORDER_ID.slice(0, 8),
    `${ORDER_ID}/../account`,
    `../${ORDER_ID}`,
    `${ORDER_ID}?next=/account`,
    `${ORDER_ID}\n`,
    ` ${ORDER_ID}`,
    null,
    undefined,
    { toString: () => ORDER_ID },
  ];
  for (const value of rejected) {
    assert.equal(isOrderId(value), false, String(value));
  }
});
