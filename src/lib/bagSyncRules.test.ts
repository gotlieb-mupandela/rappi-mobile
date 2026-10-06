import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adoptGuestBag,
  attachBagIds,
  EMPTY_BAG,
  mergeRemoteBag,
  parseStoredBag,
  settleBag,
  withLines,
  type BagLine,
  type RemoteBagRow,
} from './bagSyncRules.ts';

const shirt: BagLine = { code: 'A.1', size: 'M', qty: 1, name: 'Shirt', imageUrl: 'a.jpg', price: 100, id: 'a-1' };
const shorts: BagLine = { code: 'B.2', size: 'L', qty: 2, name: 'Shorts', imageUrl: 'b.jpg', price: 50, id: 'b-2' };
const signedIn = { ...EMPTY_BAG, owner: 'user-1' };

function remote(line: BagLine, qty = line.qty): RemoteBagRow {
  return { ...line, id: line.id!, qty };
}

test('reads the old bare-array format as a guest bag', () => {
  const state = parseStoredBag([{ ...shirt, id: undefined }, { code: 'bad' }]);
  assert.equal(state.owner, null);
  assert.deepEqual(state.lines.map((line) => line.code), ['A.1']);
});

test('keeps lines for products without a photo or name', () => {
  const state = parseStoredBag([{ ...shirt, imageUrl: null, name: null }]);
  assert.equal(state.lines.length, 1);
  assert.equal(state.lines[0].imageUrl, '');
  assert.equal(state.lines[0].name, 'A.1');
});

test('guest changes stay local and are not queued for upload', () => {
  assert.deepEqual(withLines(EMPTY_BAG, [shirt]).pending, []);
});

test('signed-in adds, quantity changes and removals are queued once per line', () => {
  const added = withLines(signedIn, [shirt]);
  const changed = withLines(added, [{ ...shirt, qty: 3 }]);
  assert.equal(changed.pending.length, 1);
  const removed = withLines(changed, []);
  assert.deepEqual(removed.pending, [{ code: 'A.1', size: 'M', id: 'a-1' }]);
});

test('the account wins for lines with no unsent local change', () => {
  const state = { ...signedIn, lines: [shirt] };
  const merged = mergeRemoteBag(state, [remote(shirt, 4), remote(shorts)]);
  assert.deepEqual(merged.lines.map((line) => [line.code, line.qty]), [['A.1', 4], ['B.2', 2]]);
});

test('lines removed on the website disappear from the phone', () => {
  const state = { ...signedIn, lines: [shirt, shorts] };
  assert.deepEqual(mergeRemoteBag(state, [remote(shorts)]).lines.map((line) => line.code), ['B.2']);
});

test('unsent local changes survive a pull', () => {
  const edited = withLines({ ...signedIn, lines: [shirt, shorts] }, [{ ...shirt, qty: 5 }]);
  const merged = mergeRemoteBag(edited, [remote(shirt, 1), remote(shorts)]);
  assert.deepEqual(merged.lines.map((line) => [line.code, line.qty]), [['A.1', 5]]);
});

test('an adopted guest bag is added on top of the account bag and queued', () => {
  const adopted = adoptGuestBag({ ...EMPTY_BAG, lines: [{ ...shirt, id: undefined, qty: 2 }] }, 'user-1');
  assert.equal(adopted.adopting, true);
  const merged = mergeRemoteBag(adopted, [remote(shirt, 3), remote(shorts)]);
  assert.equal(merged.adopting, false);
  assert.deepEqual(merged.lines.map((line) => [line.code, line.qty, line.id]), [['A.1', 5, 'a-1'], ['B.2', 2, 'b-2']]);
  assert.deepEqual(merged.pending, [{ code: 'A.1', size: 'M', id: 'a-1' }]);
});

test('an empty guest bag needs no merge', () => {
  assert.equal(adoptGuestBag(EMPTY_BAG, 'user-1').adopting, false);
});

test('ids found later are attached to lines and pending entries', () => {
  const state = withLines(signedIn, [{ ...shirt, id: undefined }]);
  const next = attachBagIds(state, { 'A.1': 'a-1' });
  assert.equal(next.lines[0].id, 'a-1');
  assert.equal(next.pending[0].id, 'a-1');
});

test('settling keeps lines that changed again while the push was in flight', () => {
  const state = withLines(withLines(signedIn, [shirt, shorts]), [{ ...shirt, qty: 2 }, shorts]);
  const settled = settleBag(state, [
    { code: 'A.1', size: 'M', qty: 1 },
    { code: 'B.2', size: 'L', qty: 2 },
  ]);
  assert.deepEqual(settled.pending.map((item) => item.code), ['A.1']);
});

test('settling a delete clears it once the line is still gone', () => {
  const state = withLines({ ...signedIn, lines: [shirt] }, []);
  assert.deepEqual(settleBag(state, [{ code: 'A.1', size: 'M', qty: null }]).pending, []);
});
