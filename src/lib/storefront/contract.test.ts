import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { productLabel, resolveTarget, validateMobileStorefront } from './contract.ts';

function fixture(): unknown {
  return JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8'));
}

function clone(): Record<string, unknown> {
  return structuredClone(fixture()) as Record<string, unknown>;
}

test('accepts the fixture feed', () => {
  const parsed = validateMobileStorefront(fixture());
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.version, '2026-10-25.1.7');
  assert.deepEqual(parsed.value.menus, ['man', 'woman', 'children', 'teams']);
  assert.equal(parsed.value.nodes.some((node) => node.key === 'fitness-gym-woman'), true);
  assert.equal(parsed.value.checkout.eurPerNad, 0.05);
  assert.deepEqual(
    parsed.value.checkout.countries.map((row) => [row.code, row.name, row.vatRate]),
    [
      ['NA', 'Namibia', 0.15],
      ['ZA', 'South Africa', 0.15],
      ['FR', 'France', 0.2],
      ['DE', 'Germany', 0.19],
      ['FI', 'Finland', 0.255],
      ['XK', 'Kosovo', 0.18],
    ],
  );
  const pack = parsed.value.products.find((product) => product.code === 'PACK-25');
  assert.ok(pack);
  assert.equal(pack.images[0], pack.cardImage);
  assert.equal(pack.line, 'Training cones');
  assert.equal(pack.packLabel, 'Training cones, Pack of 25');
  assert.equal('item' in pack, false);
  const plain = parsed.value.products.find((product) => product.code === 'PLAIN-1');
  assert.ok(plain);
  assert.equal(plain.packLabel, null);
  assert.equal(plain.cardImage, null);
  assert.deepEqual(plain.images, ['https://www.rappisportshub.com/catalog-photos/plain-ok.jpg']);
});

test('unknown target keys do not resolve to a screen', () => {
  assert.equal(resolveTarget('https://evil.example/phish'), null);
  assert.equal(resolveTarget('not-a-real-target'), null);
  assert.deepEqual(resolveTarget('/shop/men'), { screen: 'menu', menu: 'man', path: [] });
  assert.equal(resolveTarget('menu:men'), null);
  assert.equal(resolveTarget('menu:../admin'), null);
  assert.equal(resolveTarget('group:sportswear'), null);
  assert.equal(resolveTarget('group:sportswear:underwear-brama:men'), null);
  assert.equal(resolveTarget('category:hiking'), null);
  assert.equal(resolveTarget('sub:sportswear:jackets'), null);
  assert.equal(resolveTarget('search:sportswear:cones'), null);
  assert.equal(resolveTarget('audience:shoes:men'), null);
  assert.equal(resolveTarget('__proto__'), null);
  assert.equal(resolveTarget('constructor'), null);
  assert.equal(resolveTarget('prototype'), null);
  assert.equal(resolveTarget('men-brama'), null);
  assert.equal(resolveTarget('/shop/shoes?group=flow&extra=1'), null);
  assert.equal(resolveTarget('/shop/shoes?group=flow'), null);
  assert.deepEqual(resolveTarget('/shop/women?group=fitness-gym-woman'), {
    screen: 'group',
    cat: 'sportswear',
    group: 'fitness-gym-woman',
    audience: 'women',
    leaf: true,
  });
  assert.deepEqual(resolveTarget('/shop/football?group=tw-football'), {
    screen: 'group',
    cat: 'football',
    group: 'tw-football',
    leaf: true,
  });
});

test('drops a tile when fr is missing and keeps the rest of the feed', () => {
  const body = clone();
  const nodes = body.nodes as Array<Record<string, unknown>>;
  const woman = nodes.find((node) => node.key === 'woman');
  assert.ok(woman);
  woman.title = { en: 'Woman' };
  const parsed = validateMobileStorefront(body);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.nodes.some((node) => node.key === 'woman'), false);
  assert.equal(parsed.value.nodes.some((node) => node.key === 'man'), true);
});

test('rejects the whole feed when checkout numbers are not finite or not sane', () => {
  for (const patch of [
    { eurPerNad: 0 },
    { eurPerNad: -1 },
    { eurPerNad: Number.NaN },
  ]) {
    const body = clone();
    body.checkout = { ...(body.checkout as object), ...patch };
    const parsed = validateMobileStorefront(body);
    assert.equal(parsed.ok, false, JSON.stringify(patch));
  }
  const negative = clone();
  const checkout = negative.checkout as { shipping: Array<Record<string, unknown>> };
  checkout.shipping[0].amountNad = -5;
  assert.equal(validateMobileStorefront(negative).ok, false);
  const text = clone();
  const shipping = (text.checkout as { shipping: Array<Record<string, unknown>> }).shipping;
  shipping[0].amountNad = '100';
  assert.equal(validateMobileStorefront(text).ok, false);
});

test('a bad checkout country rejects the whole feed', () => {
  const protoNames = Object.getOwnPropertyNames(Object.prototype);
  for (const vatRate of [Number.NaN, Number.POSITIVE_INFINITY, -0.1, 1.5, '0.15']) {
    const body = clone();
    const countries = (body.checkout as { countries: Array<Record<string, unknown>> }).countries;
    countries[0].vatRate = vatRate;
    assert.equal(validateMobileStorefront(body).ok, false, String(vatRate));
  }
  for (const code of ['__proto__', 'constructor', 'prototype', 'na', 'NAM', 'X', '']) {
    const body = clone();
    const countries = (body.checkout as { countries: Array<Record<string, unknown>> }).countries;
    countries[0].code = code;
    assert.equal(validateMobileStorefront(body).ok, false, code);
  }
  const duplicate = clone();
  const rows = (duplicate.checkout as { countries: Array<Record<string, unknown>> }).countries;
  rows.push({ code: 'NA', name: 'Again', vatRate: 0.15 });
  assert.equal(validateMobileStorefront(duplicate).ok, false);
  const missing = clone();
  delete (missing.checkout as { countries?: unknown }).countries;
  assert.equal(validateMobileStorefront(missing).ok, false);
  const emptyName = clone();
  (emptyName.checkout as { countries: Array<Record<string, unknown>> }).countries[0].name = '   ';
  assert.equal(validateMobileStorefront(emptyName).ok, false);
  const control = clone();
  (control.checkout as { countries: Array<Record<string, unknown>> }).countries[0].name = 'Namibia\n';
  assert.equal(validateMobileStorefront(control).ok, false);
  const tooMany = clone();
  const checkout = tooMany.checkout as { countries: Array<Record<string, unknown>> };
  checkout.countries = Array.from({ length: 301 }, (_, index) => ({
    code: index.toString(36).toUpperCase().padStart(2, 'A').slice(0, 2),
    name: `Country ${index}`,
    vatRate: 0.15,
  }));
  assert.equal(validateMobileStorefront(tooMany).ok, false);
  assert.deepEqual(Object.getOwnPropertyNames(Object.prototype), protoNames);
});

test('country names are plain text and lookups do not use the feed object', () => {
  const protoNames = Object.getOwnPropertyNames(Object.prototype);
  const body = clone();
  const checkout = body.checkout as { countries: Array<Record<string, unknown>> };
  checkout.countries = [
    { code: 'NA', name: '__proto__', vatRate: 0.15 },
    { code: 'DE', name: 'constructor', vatRate: 0.19 },
    { code: 'FR', name: 'prototype', vatRate: 0.2 },
    { code: 'FI', name: '<b>Finland</b>', vatRate: 0.255 },
  ];
  const parsed = validateMobileStorefront(body);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  checkout.countries[0].name = 'changed in the feed object';
  assert.equal(parsed.value.checkout.countries[0].name, '__proto__');
  assert.equal(parsed.value.checkout.countries[3].name, '<b>Finland</b>');
  assert.deepEqual(
    parsed.value.checkout.countries.map((row) => row.code),
    ['NA', 'DE', 'FR', 'FI'],
  );
  assert.deepEqual(Object.getOwnPropertyNames(Object.prototype), protoNames);
  assert.equal(Object.prototype.hasOwnProperty('vatRate'), false);
});

test('labelFr is optional and falls back to label', () => {
  assert.equal(productLabel('fr', { label: 'Runner', labelFr: 'Coureur' }), 'Coureur');
  assert.equal(productLabel('en', { label: 'Runner', labelFr: 'Coureur' }), 'Runner');
  assert.equal(productLabel('fr', { label: 'Runner', labelFr: null }), 'Runner');
  assert.equal(productLabel('fr', { label: 'Runner' }), 'Runner');
  assert.equal(productLabel('en', { label: null, labelFr: 'Coureur' }), null);
  assert.equal(productLabel('en', { label: '<b>Runner</b>' }), '<b>Runner</b>');
  const body = clone();
  const products = body.products as Array<Record<string, unknown>>;
  products[0].label = null;
  products[0].labelFr = 'Coureur';
  const parsed = validateMobileStorefront(body);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  const pack = parsed.value.products.find((product) => product.code === 'PACK-25');
  assert.equal(pack?.label, null);
  assert.equal(pack?.labelFr, null);
});

test('a bad span, tone, or slug hides that node and a bad audience row is omitted', () => {
  const body = clone();
  const nodes = body.nodes as Array<Record<string, unknown>>;
  const kids = nodes.find((node) => node.key === 'children');
  assert.ok(kids);
  kids.span = 3;
  const teams = nodes.find((node) => node.key === 'teams');
  assert.ok(teams);
  teams.tone = 'blue';
  const sportswear = nodes.find((node) => node.key === 'sportswear');
  assert.ok(sportswear);
  sportswear.audiences = [
    { id: 'sportswear--men', label: { en: 'Men', fr: 'Hommes' }, count: 10, target: '/shop/sportswear?audience=men' },
    { id: 'sportswear--bad', label: { en: 'Bad', fr: '' }, count: 1, target: '/shop/sportswear?audience=men' },
    { extra: true },
  ];
  sportswear.unexpected = 'kept';
  const parsed = validateMobileStorefront(body);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.nodes.some((node) => node.key === 'children'), false);
  assert.equal(parsed.value.nodes.some((node) => node.key === 'teams'), false);
  const kept = parsed.value.nodes.find((node) => node.key === 'sportswear');
  assert.ok(kept);
  assert.deepEqual(kept.audiences.map((row) => row.id), ['sportswear--men']);
});

test('the fixture omits Flow and records TEAM/14 under balls-bags', () => {
  const raw = fixture() as {
    nodes: Array<{ key: string; target: string; group: string | null }>;
    products: Array<{ code: string; category: string; subcategory: string | null }>;
  };
  assert.equal(raw.nodes.some((node) => node.key === 'flow' || node.target === '/shop/shoes?group=flow' || node.group === '-flow'), false);
  const team = raw.products.find((product) => product.code === 'TEAM/14');
  assert.ok(team);
  assert.equal(team.category, 'balls-bags');
  assert.equal(team.subcategory, 'bags');
  assert.equal(resolveTarget('/shop/shoes?group=flow'), null);
});

test('a feed that is not an object is rejected', () => {
  assert.equal(validateMobileStorefront(null).ok, false);
  assert.equal(validateMobileStorefront([]).ok, false);
  assert.equal(validateMobileStorefront({ version: 'x' }).ok, false);
});
