import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import test from 'node:test';

import {
  FEED_GENERATED_PATH,
  FEED_TABLE_PATH,
  KEPT_ROUTES_PATH,
  NAMESPACED_JSON_PATH,
  SUB_LINK_JSON_PATH,
  WEB_PIN_PATH,
  feedTargetCheckFailure,
  renderFeedTargets,
  subLinkTargetEntries,
} from '../../../scripts/gen-feed-targets.mjs';
import { childNodes, shopTileDestination } from './adapt.ts';
import { validateMobileStorefront } from './contract.ts';
import { FEED_TARGETS } from './feedTargets.generated.ts';
import { resolveTarget } from './targets.ts';

const HUB_COUNTS: Readonly<Record<string, number>> = {
  sportswear: 24,
  football: 18,
  basketball: 5,
  swimming: 3,
  rugby: 4,
  cricket: 4,
  boxing: 1,
  hockey: 1,
  'running-fitness': 19,
  brama: 3,
  padel: 9,
  hiking: 6,
  resort: 8,
  lifestyle: 1,
  'teampro-2026': 5,
  shoes: 24,
  'balls-bags': 4,
};

const rows = JSON.parse(readFileSync(SUB_LINK_JSON_PATH, 'utf8')) as Array<{
  hub: string;
  sub: string;
  group?: string;
  href: string;
}>;

function folderKey(sub: string, group?: string) {
  return group ? `sub:${sub}@${group}` : `sub:${sub}`;
}

test('every shop sub-link href resolves to its fixed group route', () => {
  assert.equal(rows.length, 139);
  assert.equal(rows.filter((row) => FEED_TARGETS.has(row.href)).length, 139);
  for (const row of rows) {
    assert.match(row.href, /^\/shop\/[a-z0-9-]+\?sub=[a-z0-9-]+(?:&group=[a-z0-9-]+)?$/);
    assert.equal(row.href.includes('--'), false);
  }
  const hubs = new Map<string, number>();
  for (const row of rows) {
    const route = resolveTarget(row.href);
    assert.deepEqual(route, {
      screen: 'group',
      cat: row.hub,
      group: folderKey(row.sub, row.group),
      leaf: true,
    });
    hubs.set(row.hub, (hubs.get(row.hub) ?? 0) + 1);
  }
  assert.equal(hubs.size, 17);
  assert.deepEqual(Object.fromEntries(hubs), HUB_COUNTS);
});

test('a changed href does not resolve', () => {
  const href = '/shop/sportswear?sub=jerseys&group=shirts';
  assert.ok(resolveTarget(href));
  assert.equal(resolveTarget('/shop/sportswear?sub=not-a-real-sub'), null);
  assert.equal(resolveTarget(`${href}&extra=1`), null);
  assert.equal(resolveTarget('/shop/sportswear?group=shirts&sub=jerseys'), null);
  assert.equal(resolveTarget('/shop/sportswear?sub=Jerseys&group=shirts'), null);
  assert.equal(resolveTarget('/shop/Sportswear?sub=jerseys&group=shirts'), null);
  assert.equal(resolveTarget(`${href}/`), null);
  assert.equal(resolveTarget('/shop/sportswear/?sub=jerseys&group=shirts'), null);
  assert.equal(resolveTarget('/shop/../etc'), null);
  assert.equal(resolveTarget('/shop/sportswear/../football?sub=jerseys&group=shirts'), null);
  assert.equal(resolveTarget(`https://www.rappisportshub.com${href}`), null);
});

test('the generated file is exactly the generator output', () => {
  const pin = readFileSync(WEB_PIN_PATH, 'utf8');
  const table = JSON.parse(readFileSync(FEED_TABLE_PATH, 'utf8'));
  const namespaced = JSON.parse(readFileSync(NAMESPACED_JSON_PATH, 'utf8'));
  const kept = JSON.parse(readFileSync(KEPT_ROUTES_PATH, 'utf8'));
  const generated = readFileSync(FEED_GENERATED_PATH, 'utf8');
  const pinSha = JSON.parse(pin).subLinks as string;
  assert.equal(generated, renderFeedTargets(pin, table, namespaced, kept, rows));
  assert.equal(generated.includes(pinSha), true);
  assert.equal(generated.includes('Joma'), false);
  assert.equal(JSON.stringify([...FEED_TARGETS]).includes('Joma'), false);
  assert.equal(readFileSync(SUB_LINK_JSON_PATH, 'utf8').includes('Joma'), false);
});

test('a target that is not in the list drops the link and opens nothing', () => {
  const missing = '/shop/sportswear?sub=not-in-the-list';
  assert.equal(FEED_TARGETS.has(missing), false);
  assert.equal(FEED_TARGETS.get(missing), undefined);
  assert.equal(resolveTarget(missing), null);
  for (const key of ['__proto__', 'constructor', 'prototype', 'toString']) {
    assert.equal(FEED_TARGETS.get(key), undefined);
    assert.equal(resolveTarget(key), null);
  }

  const parsed = validateMobileStorefront(JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8')));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const broken = structuredClone(parsed.value);
  const beach = broken.nodes.find((node) => node.key === 'beachwear');
  const menu = broken.nodes.find((node) => node.key === 'man');
  assert.ok(beach);
  assert.ok(menu);
  beach.target = missing;
  menu.target = missing;
  assert.equal(childNodes(broken, 'man').some((node) => node.key === 'beachwear'), false);
  assert.equal(shopTileDestination(broken, 'man'), null);
});

test('check:sub-links fails when the committed list drifts', () => {
  const pin = readFileSync(WEB_PIN_PATH, 'utf8');
  const table = readFileSync(FEED_TABLE_PATH, 'utf8');
  const namespaced = readFileSync(NAMESPACED_JSON_PATH, 'utf8');
  const kept = readFileSync(KEPT_ROUTES_PATH, 'utf8');
  const committed = readFileSync(SUB_LINK_JSON_PATH, 'utf8');
  const generated = readFileSync(FEED_GENERATED_PATH, 'utf8');
  const subSha = JSON.parse(pin).subLinks as string;
  assert.equal(feedTargetCheckFailure(pin, pin, table, table, namespaced, namespaced, kept, kept, committed, committed, generated), null);
  const drifted = committed.replace('"count": 117', '"count": 999');
  assert.notEqual(drifted, committed);
  const listDrift = feedTargetCheckFailure(pin, pin, table, table, namespaced, namespaced, kept, kept, drifted, committed, generated);
  assert.match(listDrift ?? '', /storefront-sub-links.json has drifted/);
  assert.match(listDrift ?? '', new RegExp(subSha));
  const handEdited = generated.replace('sub:jerseys@shirts', 'sub:jerseys@nope');
  assert.match(
    feedTargetCheckFailure(pin, pin, table, table, namespaced, namespaced, kept, kept, committed, committed, handEdited) ?? '',
    /does not match/,
  );
});

test('the generator rejects a bad href and a duplicate href', () => {
  const badHref = rows.map((row, index) => (index === 0 ? { ...row, href: '/shop/nope' } : row));
  assert.throws(() => subLinkTargetEntries(badHref));
  const duplicate = rows.map((row, index) => (index === 1 ? { ...rows[0] } : row));
  assert.throws(() => subLinkTargetEntries(duplicate));
  assert.throws(() => subLinkTargetEntries([{ ...rows[0], hub: '../etc', href: '/shop/../etc?sub=jerseys&group=shirts' }]));
});
