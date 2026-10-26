import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { HIDDEN_FEED_TARGETS, TARGET_ALIAS_KEYS, resolveTarget } from './targets.ts';

const LISTED = readFileSync(new URL('./feed-targets.txt', import.meta.url), 'utf8')
  .split('\n')
  .filter((line) => line.length > 0);

test('every PR 98 target path maps to an app route or is deliberately hidden', () => {
  assert.equal(LISTED.length, 1348);
  assert.equal(new Set(LISTED).size, 1348);
  assert.deepEqual(TARGET_ALIAS_KEYS, LISTED.filter((path) => !HIDDEN_FEED_TARGETS.includes(path)));
  const screens = new Set(['home', 'menu', 'category', 'group']);
  for (const path of LISTED) {
    const route = resolveTarget(path);
    if (HIDDEN_FEED_TARGETS.includes(path)) {
      assert.equal(route, null, path);
      continue;
    }
    assert.ok(route, path);
    assert.equal(screens.has(route.screen), true, path);
  }
  assert.deepEqual(HIDDEN_FEED_TARGETS, []);
  assert.equal(resolveTarget('/shop/shoes?group=not-a-feed-folder'), null);
  assert.equal(resolveTarget('/shop/shoes?group=flow '), null);
  assert.equal(resolveTarget('https://www.rappisportshub.com/shop/shoes?group=flow'), null);
});
