import assert from 'node:assert/strict';
import test from 'node:test';

import { SIGNED_OUT_STORAGE_KEYS, clearLocalSession } from './localSession.ts';

test('sign-out clears the query cache and the shopping keys', async () => {
  const removed: string[][] = [];
  let queriesCleared = 0;
  let persistedRemoved = 0;
  await clearLocalSession({
    clearQueries: () => {
      queriesCleared += 1;
    },
    removePersistedQueries: async () => {
      persistedRemoved += 1;
    },
    removeItems: async (keys) => {
      removed.push([...keys]);
    },
  });

  assert.equal(queriesCleared, 1);
  assert.equal(persistedRemoved, 1);
  assert.deepEqual(removed, [SIGNED_OUT_STORAGE_KEYS]);
  assert.deepEqual([...SIGNED_OUT_STORAGE_KEYS], ['bag', 'wishlist', 'pendingPayment']);
});
