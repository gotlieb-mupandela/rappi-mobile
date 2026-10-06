import assert from 'node:assert/strict';
import test from 'node:test';

import { categoryName, isHiddenCategory } from './categories.ts';

test('uses the Namibia storefront category names', () => {
  assert.equal(categoryName('running-fitness'), 'Running & Fitness');
  assert.equal(categoryName('balls-bags'), 'Balls & Bags');
  assert.equal(categoryName('new-category'), 'New Category');
});

test('keeps netball out of the mobile navigation', () => {
  assert.equal(isHiddenCategory('netball'), true);
  assert.equal(isHiddenCategory('football'), false);
});
