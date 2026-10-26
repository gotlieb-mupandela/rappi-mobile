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
  assert.equal(parsed.value.version, '2026-10-25.1');
  assert.equal(parsed.value.menus.some((node) => node.key === 'men-brama'), true);
  assert.equal(parsed.value.checkout.vatRate, 0.15);
  assert.equal(parsed.value.checkout.eurPerNad, 0.05);
  const pack = parsed.value.products.find((product) => product.code === 'PACK-25');
  assert.ok(pack);
  assert.notEqual(pack.images[0], pack.cardImage);
  assert.equal(pack.images[0], 'https://www.rappisportshub.com/catalog-photos/pack-25-a.jpg');
  const plain = parsed.value.products.find((product) => product.code === 'PLAIN-1');
  assert.ok(plain);
  assert.equal(plain.cardImage, null);
  assert.deepEqual(plain.images, ['https://www.rappisportshub.com/catalog-photos/plain-ok.jpg']);
});

test('unknown target keys do not resolve to a screen', () => {
  assert.equal(resolveTarget('https://evil.example/phish'), null);
  assert.equal(resolveTarget('not-a-real-target'), null);
  assert.equal(resolveTarget('/shop/men'), null);
  assert.equal(resolveTarget('menu:../admin'), null);
  assert.equal(resolveTarget('group:sportswear'), null);
  assert.ok(resolveTarget('men-brama'));
  assert.deepEqual(resolveTarget('group:sportswear:underwear-brama:men'), {
    screen: 'group',
    cat: 'sportswear',
    group: 'underwear-brama',
    audience: 'men',
    leaf: true,
  });
  assert.deepEqual(resolveTarget('category:hiking'), { screen: 'category', slug: 'hiking' });
  assert.deepEqual(resolveTarget('sub:sportswear:jackets'), {
    screen: 'group',
    cat: 'sportswear',
    group: 'sub:jackets',
    audience: undefined,
    leaf: true,
  });
});

test('drops a tile when fr is missing and keeps the rest of the feed', () => {
  const body = clone();
  const menus = body.menus as Array<Record<string, unknown>>;
  const men = menus.find((node) => node.key === 'men');
  assert.ok(men);
  men.title = { en: 'Man' };
  const parsed = validateMobileStorefront(body);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.menus.some((node) => node.key === 'men'), false);
  assert.equal(parsed.value.menus.some((node) => node.key === 'women'), true);
});

test('rejects the whole feed when checkout numbers are not finite or not sane', () => {
  for (const patch of [
    { vatRate: Number.NaN },
    { vatRate: Number.POSITIVE_INFINITY },
    { vatRate: -0.1 },
    { vatRate: 1.5 },
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

test('a feed that is not an object is rejected', () => {
  assert.equal(validateMobileStorefront(null).ok, false);
  assert.equal(validateMobileStorefront([]).ok, false);
  assert.equal(validateMobileStorefront({ version: 'x' }).ok, false);
});
