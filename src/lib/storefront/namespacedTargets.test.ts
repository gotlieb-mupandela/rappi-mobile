import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  NAMESPACED_GENERATED_PATH,
  NAMESPACED_JSON_PATH,
  NAMESPACED_SOURCE_SHA,
  namespacedCheckFailure,
  renderNamespacedTargets,
} from '../../../scripts/gen-namespaced-targets.mjs';
import { categoryAudiences, foldersForCategory } from './adapt.ts';
import { validateMobileStorefront } from './contract.ts';
import { NAMESPACED_TARGETS } from './namespacedTargets.generated.ts';
import { resolveTarget } from './targets.ts';

const rows = JSON.parse(readFileSync(NAMESPACED_JSON_PATH, 'utf8')) as Array<{ id: string; href: string }>;

function shell() {
  return JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8')) as {
    nodes: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
}

test('every namespaced feed href resolves from a real feed shape', () => {
  assert.equal(rows.length, 292);
  assert.equal(NAMESPACED_TARGETS.size, 292);
  const feed = shell();
  const base = feed.nodes[0];
  feed.nodes = rows.map((row, index) => ({
    key: row.id,
    kind: row.href.includes('audience=') ? 'tile' : 'tile',
    parent: null,
    order: index,
    target: row.href,
    image: null,
    title: { en: 'Tile', fr: 'Tuile' },
    description: { en: 'Tile', fr: 'Tuile' },
    hidden: false,
    count: 1,
    group: null,
    tiles: [],
    span: null,
    tone: null,
    slug: null,
    audiences: [],
    extraField: base ? true : false,
  }));
  const parsed = validateMobileStorefront(feed);
  assert.equal(parsed.ok, true, parsed.ok ? '' : parsed.reason);
  if (!parsed.ok) return;
  assert.equal(parsed.value.nodes.length, 292);
  for (const row of rows) {
    const route = resolveTarget(row.href);
    assert.deepEqual(route, NAMESPACED_TARGETS.get(row.href), row.href);
    assert.equal(parsed.value.nodes.some((node) => node.target === row.href), true, row.href);
  }
  const sample = '/shop/sportswear?audience=men';
  assert.equal(resolveTarget(`${sample}&extra=1`), null);
  assert.equal(resolveTarget('/shop/sportswear?group=shirts&audience=men'), null);
  assert.equal(resolveTarget('/shop/Sportswear?audience=men'), null);
  assert.equal(resolveTarget('/shop/sportswear?audience=Men'), null);
  assert.equal(resolveTarget('/shop/football?group=tw-medias/'), null);
  assert.equal(resolveTarget('https://www.rappisportshub.com/shop/football?group=tw-medias'), null);
  for (const key of ['__proto__', 'constructor', 'toString']) {
    assert.equal(NAMESPACED_TARGETS.get(key), undefined);
    assert.equal(resolveTarget(key), null);
  }
});

test('the committed fixture shape resolves its type tile, series tile, and audience row', () => {
  const parsed = validateMobileStorefront(shell());
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(foldersForCategory(parsed.value, 'sportswear').some((node) => node.key === 'sportswear--shirts'), true);
  assert.deepEqual(resolveTarget('/shop/sportswear?group=shirts'), {
    screen: 'group',
    cat: 'sportswear',
    group: 'shirts',
    leaf: true,
  });
  assert.equal(foldersForCategory(parsed.value, 'football').some((node) => node.key === 'football--tw-medias'), true);
  assert.deepEqual(resolveTarget('/shop/football?group=tw-medias'), {
    screen: 'group',
    cat: 'football',
    group: 'tw-medias',
    leaf: true,
  });
  assert.deepEqual(categoryAudiences(parsed.value, 'sportswear').map((row) => row.id), ['sportswear--men']);
});

test('the generated file matches the generator and the committed list', () => {
  const committed = readFileSync(NAMESPACED_JSON_PATH, 'utf8');
  const generated = readFileSync(NAMESPACED_GENERATED_PATH, 'utf8');
  assert.equal(generated, renderNamespacedTargets(rows));
  assert.equal(generated.includes(NAMESPACED_SOURCE_SHA), true);
  assert.equal(namespacedCheckFailure(committed, committed, generated), null);
  const drifted = committed.replace('sportswear--men', 'sportswear--mann');
  assert.match(namespacedCheckFailure(drifted, committed, generated) ?? '', /drifted from the committed copy/);
});
