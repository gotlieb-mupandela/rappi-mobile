import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { foldersForCategory, lineByCode, localized, menuLevel, orderedCategories, visibleNodes } from './adapt.ts';
import { checkoutDisplay, formatApproxEur } from './checkoutDisplay.ts';
import { validateMobileStorefront } from './contract.ts';
import type { MobileStorefront } from './types.ts';

function feed(): MobileStorefront {
  const parsed = validateMobileStorefront(JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8')));
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.value;
}

test('orders menus, hides hidden tiles, and hides unknown targets', () => {
  const value = feed();
  assert.deepEqual(visibleNodes(value.homeTiles, null).map((node) => node.key), ['kids', 'teamwear']);
  assert.deepEqual(visibleNodes(value.menus, 'men').map((node) => node.key), ['men-racket', 'men-hiking', 'men-brama']);
  const broken = structuredClone(value);
  const brama = broken.menus.find((node) => node.key === 'men-brama');
  assert.ok(brama);
  brama.target = 'https://evil.example/phish';
  assert.equal(visibleNodes(broken.menus, 'men').some((node) => node.key === 'men-brama'), false);
  assert.equal(visibleNodes(broken.menus, 'men').some((node) => node.key === 'men-hiking'), true);
});

test('blank french copy falls back to english', () => {
  const kids = feed().homeTiles.find((node) => node.key === 'kids');
  assert.ok(kids);
  assert.equal(localized(kids.description, 'fr'), 'Youth sport.');
  assert.equal(localized(kids.title, 'fr'), 'Enfants');
  assert.equal(localized(kids.title, 'en'), 'Kids');
});

test('category order skips hidden categories and nests children', () => {
  const value = feed();
  assert.deepEqual(orderedCategories(value).map((node) => node.key), ['sportswear', 'shoes']);
  assert.deepEqual(foldersForCategory(value, 'sportswear').map((node) => node.key), ['brama', 'hiking']);
});

test('menu trail follows parent links', () => {
  const level = menuLevel(feed(), 'men', []);
  assert.ok(level);
  assert.equal(level.trail[0].key, 'men');
  assert.deepEqual(level.nodes.map((node) => node.key), ['men-racket', 'men-hiking', 'men-brama']);
  assert.equal(menuLevel(feed(), 'missing', []), null);
});

test('product line is kept as plain text', () => {
  const lines = lineByCode(feed());
  assert.equal(lines?.get('PACK-25'), 'Training cones');
  assert.equal(lines?.has('SHOE-1'), false);
});

test('checkout display uses feed amounts, one VAT fraction, and drops unknown keys', () => {
  const display = checkoutDisplay(feed().checkout, 'fr');
  assert.deepEqual(display.shipping.map((row) => [row.id, row.cost, row.label]), [
    ['standard', 100, 'Standard (5-8 jours)'],
    ['express', 150, 'Express (2-3 jours)'],
    ['pickup', 0, 'Retrait au hub'],
  ]);
  assert.equal(display.vatPercent, 15);
  assert.equal(display.eurPerNad, 0.05);
  assert.deepEqual(display.countries.map((row) => row.name), ['Namibia', 'South Africa', 'France']);
  assert.match(formatApproxEur(304, 0.05), /^approx\. 15,20\s€$/u);
});
