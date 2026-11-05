import assert from 'node:assert/strict';
import test from 'node:test';

import { feedPathEnabled, storefrontRollbackEnabled } from './flag.ts';

test('the feed path is on unless rollback is exactly 1 or true', () => {
  assert.equal(feedPathEnabled({}), true);
  assert.equal(storefrontRollbackEnabled({}), false);
  assert.equal(storefrontRollbackEnabled({ STOREFRONT_ROLLBACK: '' }), false);
  assert.equal(storefrontRollbackEnabled({ EXPO_PUBLIC_STOREFRONT_ROLLBACK: '0' }), false);
  assert.equal(storefrontRollbackEnabled({ STOREFRONT_ROLLBACK: 'yes' }), false);
  assert.equal(storefrontRollbackEnabled({ EXPO_PUBLIC_STOREFRONT_ROLLBACK: 'false' }), false);
  assert.equal(feedPathEnabled({ STOREFRONT_ROLLBACK: '1' }), false);
  assert.equal(storefrontRollbackEnabled({ EXPO_PUBLIC_STOREFRONT_ROLLBACK: 'true' }), true);
  assert.equal(storefrontRollbackEnabled({ STOREFRONT_ROLLBACK: '1' }), true);
});
