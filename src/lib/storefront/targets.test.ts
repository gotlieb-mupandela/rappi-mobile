import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { routeForHref } from '../../../scripts/gen-feed-targets.mjs';
import { HIDDEN_FEED_TARGETS, resolveTarget } from './targets.ts';
import { validateMobileStorefront } from './contract.ts';

const qa = JSON.parse(readFileSync(new URL('../../../data/b-qa16.json', import.meta.url), 'utf8')) as {
  unresolved: string[];
  never_sent_alias: string[];
};
const table = JSON.parse(readFileSync(new URL('../../../data/feed-target-table.json', import.meta.url), 'utf8')) as Array<{
  id: string;
  href: string;
}>;
const kept = JSON.parse(readFileSync(new URL('../../../data/kept-feed-routes.json', import.meta.url), 'utf8')) as Array<{
  href: string;
  route: Record<string, unknown>;
}>;

function shell() {
  return JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8')) as {
    nodes: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
}

test('the six home tile ids resolve to their site paths', () => {
  const expected = [
    ['home-teamwear', '/teamwear', { screen: 'menu', menu: 'teams', path: [] }],
    ['home-sportswear', '/category/sportswear', { screen: 'category', slug: 'sportswear' }],
    ['home-running', '/category/running-fitness', { screen: 'category', slug: 'running-fitness' }],
    ['home-lifestyle', '/category/lifestyle', { screen: 'category', slug: 'lifestyle' }],
    ['home-footwear', '/category/shoes', { screen: 'category', slug: 'shoes' }],
    ['home-kids', '/shop/kids', { screen: 'menu', menu: 'children', path: [] }],
  ] as const;
  assert.equal(table.length, 1357);
  for (const [id, href, route] of expected) {
    assert.equal(table.find((row) => row.id === id)?.href, href, id);
    assert.deepEqual(resolveTarget(href), route, id);
    assert.equal(resolveTarget(id), null, id);
  }
});

test('every web table target resolves, starting from the QA list', () => {
  assert.equal(qa.unresolved.length, 53);
  for (const href of qa.unresolved) {
    assert.ok(resolveTarget(href), href);
  }
  const hrefs = new Set(table.map((row) => row.href));
  assert.equal(hrefs.size, 1347);
  for (const href of hrefs) {
    const route = resolveTarget(href);
    assert.ok(route, href);
    assert.equal(['home', 'menu', 'category', 'group'].includes(route.screen), true, href);
  }
  assert.deepEqual(HIDDEN_FEED_TARGETS, []);
  assert.equal(resolveTarget('/shop/shoes?group=not-a-feed-folder'), null);
  assert.equal(resolveTarget('/shop/shoes?group=flow '), null);
  assert.equal(resolveTarget('/shop/shoes?group=flow'), null);
  assert.equal(resolveTarget('https://www.rappisportshub.com/shop/football?group=tw-football'), null);
  assert.equal(resolveTarget('/shop/Football?group=tw-football'), null);
  assert.equal(resolveTarget('/shop/football?group=tw-football/'), null);
  assert.equal(resolveTarget('/shop/football?group=TW-football'), null);
  assert.equal(resolveTarget('/shop/football/?group=tw-football'), null);
  const reordered = '/shop/shoes?group=jp-8bd9e309a9&audience=women';
  assert.equal(table.some((row) => row.href === reordered), false);
  assert.equal(resolveTarget(reordered), null);
});

test('paths kept from the old table keep the same route and Flow is gone', () => {
  const hrefs = new Set(table.map((row) => row.href));
  assert.equal(hrefs.has('/shop/shoes?group=flow'), false);
  assert.equal(qa.never_sent_alias.includes('/shop/shoes?group=flow'), true);
  for (const href of qa.never_sent_alias) {
    assert.equal(hrefs.has(href), false, href);
    assert.equal(resolveTarget(href), null, href);
  }
  for (const row of kept) {
    if (!hrefs.has(row.href)) continue;
    assert.deepEqual(resolveTarget(row.href), row.route, row.href);
    assert.deepEqual(routeForHref(row.href), row.route, row.href);
  }
});

test('a feed built from every fixed id resolves that id target', () => {
  const feed = shell();
  const base = feed.nodes[0];
  feed.nodes = table.map((row, index) => ({
    key: row.id,
    kind: 'tile',
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
  assert.equal(parsed.value.nodes.length, table.length);
  for (const row of table) {
    assert.equal(parsed.value.nodes.some((node) => node.key === row.id && node.target === row.href), true, row.id);
    assert.ok(resolveTarget(row.href), row.href);
  }
});
