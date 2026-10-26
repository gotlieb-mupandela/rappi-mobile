import assert from 'node:assert/strict';
import test from 'node:test';

import { categoryName } from '../categories.ts';
import { dataDrivenStorefrontEnabled } from './flag.ts';

test('DATA_DRIVEN_STOREFRONT defaults off', () => {
  assert.equal(dataDrivenStorefrontEnabled({}), false);
  assert.equal(dataDrivenStorefrontEnabled({ DATA_DRIVEN_STOREFRONT: '' }), false);
  assert.equal(dataDrivenStorefrontEnabled({ EXPO_PUBLIC_DATA_DRIVEN_STOREFRONT: '0' }), false);
  assert.equal(dataDrivenStorefrontEnabled({ DATA_DRIVEN_STOREFRONT: 'yes' }), false);
});

test('the flag turns on only for 1 or true', () => {
  assert.equal(dataDrivenStorefrontEnabled({ DATA_DRIVEN_STOREFRONT: '1' }), true);
  assert.equal(dataDrivenStorefrontEnabled({ EXPO_PUBLIC_DATA_DRIVEN_STOREFRONT: 'true' }), true);
});

test('flag off keeps the existing category names', () => {
  assert.equal(dataDrivenStorefrontEnabled({}), false);
  assert.equal(categoryName('running-fitness'), 'Running');
  assert.equal(categoryName('balls-bags'), 'Balls & bags');
  assert.equal(categoryName('shoes', 'fr'), 'Chaussures');
  assert.equal(categoryName('new-category'), 'New Category');
});
