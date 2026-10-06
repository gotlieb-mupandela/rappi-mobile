import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addEntry,
  adoptGuestList,
  attachIds,
  EMPTY_WISHLIST,
  mergeRemote,
  parseStoredWishlist,
  removeEntry,
  settlePending,
  WISHLIST_LIMIT,
} from './wishlistRules.ts';

const signedIn = { ...EMPTY_WISHLIST, owner: 'user-1' };

test('reads the old array-of-codes format, dropping blanks and duplicates', () => {
  const state = parseStoredWishlist(['A.1', '', 'B.2', 'A.1', 7]);
  assert.deepEqual(
    state.entries.map((entry) => entry.code),
    ['A.1', 'B.2'],
  );
  assert.equal(state.owner, null);
});

test('guest changes stay local and are not queued for upload', () => {
  const state = addEntry(EMPTY_WISHLIST, { code: 'A.1', id: 'a-1', addedAt: 1 });
  assert.deepEqual(state.pendingAdd, []);
  assert.deepEqual(removeEntry(state, 'A.1').pendingRemove, []);
});

test('signed-in add then remove cancels out instead of queueing both', () => {
  const added = addEntry(signedIn, { code: 'A.1', id: 'a-1', addedAt: 1 });
  assert.deepEqual(added.pendingAdd, ['a-1']);
  const removed = removeEntry(added, 'A.1');
  assert.deepEqual(removed.pendingAdd, []);
  assert.deepEqual(removed.pendingRemove, ['a-1']);
  assert.deepEqual(addEntry(removed, { code: 'A.1', id: 'a-1', addedAt: 2 }).pendingRemove, []);
});

test('refuses to grow past the limit', () => {
  let state = EMPTY_WISHLIST;
  for (let i = 0; i < WISHLIST_LIMIT + 5; i += 1) state = addEntry(state, { code: `C.${i}`, addedAt: i });
  assert.equal(state.entries.length, WISHLIST_LIMIT);
});

test('a guest list is uploaded to the account on sign in', () => {
  const guest = { ...EMPTY_WISHLIST, entries: [{ code: 'A.1', id: 'a-1', addedAt: 1 }, { code: 'B.2', addedAt: 2 }] };
  const adopted = adoptGuestList(guest, 'user-1');
  assert.equal(adopted.owner, 'user-1');
  assert.deepEqual(adopted.pendingAdd, ['a-1']);
  assert.deepEqual(attachIds(adopted, { 'B.2': 'b-2' }).pendingAdd, ['a-1', 'b-2']);
});

test('merging keeps unsent local changes and drops items removed on another device', () => {
  const state = {
    owner: 'user-1',
    entries: [
      { code: 'KEEP.1', id: 'keep-1', size: 'M', addedAt: 1 },
      { code: 'GONE.1', id: 'gone-1', addedAt: 2 },
      { code: 'NEW.1', id: 'new-1', addedAt: 3 },
      { code: 'LEGACY.1', addedAt: 4 },
    ],
    pendingAdd: ['new-1'],
    pendingRemove: ['removed-1'],
  };
  const merged = mergeRemote(state, [
    { id: 'keep-1', code: 'KEEP.1', addedAt: 1 },
    { id: 'removed-1', code: 'REMOVED.1', addedAt: 5 },
    { id: 'web-1', code: 'WEB.1', addedAt: 6 },
  ]);
  assert.deepEqual(merged.entries.map((entry) => entry.code).sort(), ['KEEP.1', 'LEGACY.1', 'NEW.1', 'WEB.1']);
  assert.equal(merged.entries.find((entry) => entry.code === 'KEEP.1')?.size, 'M');
});

test('settling clears only what was actually sent', () => {
  const state = { ...signedIn, pendingAdd: ['a', 'b'], pendingRemove: ['c'] };
  assert.deepEqual(settlePending(state, { added: ['a'], removed: [] }), { ...state, pendingAdd: ['b'] });
});
