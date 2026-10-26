import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import test from 'node:test';

import {
  SUB_LINK_GENERATED_PATH,
  SUB_LINK_JSON_PATH,
  SUB_LINK_SOURCE_SHA,
  renderSubLinkTargets,
} from '../../../scripts/gen-sub-link-targets.mjs';
import { SUB_LINK_TARGETS } from './subLinkTargets.generated.ts';
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
  assert.equal(Object.keys(SUB_LINK_TARGETS).length, 139);
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
  const generated = readFileSync(SUB_LINK_GENERATED_PATH, 'utf8');
  assert.equal(generated, renderSubLinkTargets(rows));
  assert.equal(generated.includes(SUB_LINK_SOURCE_SHA), true);
  assert.equal(generated.includes('Joma'), false);
  assert.equal(JSON.stringify(SUB_LINK_TARGETS).includes('Joma'), false);
  assert.equal(readFileSync(SUB_LINK_JSON_PATH, 'utf8').includes('Joma'), false);
});

test('the generator rejects a bad href and a duplicate href', () => {
  const badHref = rows.map((row, index) => (index === 0 ? { ...row, href: '/shop/nope' } : row));
  assert.throws(() => renderSubLinkTargets(badHref));
  const duplicate = rows.map((row, index) => (index === 1 ? { ...rows[0] } : row));
  assert.throws(() => renderSubLinkTargets(duplicate));
  assert.throws(() => renderSubLinkTargets([{ ...rows[0], hub: '../etc', href: '/shop/../etc?sub=jerseys&group=shirts' }]));
});
