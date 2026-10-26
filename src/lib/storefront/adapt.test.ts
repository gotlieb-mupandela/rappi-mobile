import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { categoryAudiences, childNodes, foldersForCategory, headerMenus, homeTiles, lineByCode, localized, menuLevel, orderedCategories } from './adapt.ts';
import { checkoutDisplay, flagOnTotalsNote, formatApproxEur, selectedPaymentMethod, shippingLoading, shippingUnavailable, vatPercentForCountry } from './checkoutDisplay.ts';
import { validateMobileStorefront } from './contract.ts';
import { en } from '../../i18n/en.ts';
import { fr } from '../../i18n/fr.ts';
import type { MobileStorefront } from './types.ts';

function feed(): MobileStorefront {
  const parsed = validateMobileStorefront(JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8')));
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.value;
}

test('orders menus, hides hidden tiles, and hides unknown targets', () => {
  const value = feed();
  assert.deepEqual(homeTiles(value).map((node) => node.key), ['children', 'teams', 'sportswear']);
  assert.deepEqual(headerMenus(value).map((node) => node.key), ['man', 'woman', 'children', 'teams']);
  assert.deepEqual(childNodes(value, 'man').map((node) => node.key), ['beachwear', 'athletes-combat']);
  const broken = structuredClone(value);
  const beach = broken.nodes.find((node) => node.key === 'beachwear');
  assert.ok(beach);
  beach.target = 'https://evil.example/phish';
  assert.equal(childNodes(broken, 'man').some((node) => node.key === 'beachwear'), false);
  beach.target = '/shop/shoes?group=flow-extra';
  assert.equal(childNodes(broken, 'man').some((node) => node.key === 'beachwear'), false);
  beach.target = 'group:sportswear:beachwear:men';
  assert.equal(childNodes(broken, 'man').some((node) => node.key === 'beachwear'), false);
  assert.equal(childNodes(broken, 'man').some((node) => node.key === 'athletes-combat'), true);
});

test('blank french copy falls back to english', () => {
  const kids = feed().nodes.find((node) => node.key === 'children');
  assert.ok(kids);
  assert.equal(localized(kids.description, 'fr'), 'Youth sport.');
  assert.equal(localized(kids.title, 'fr'), 'Enfants');
  assert.equal(localized(kids.title, 'en'), 'Kids');
});

test('category order skips hidden categories and nests children', () => {
  const value = feed();
  assert.deepEqual(orderedCategories(value).map((node) => node.key), ['sportswear', 'shoes']);
  assert.deepEqual(foldersForCategory(value, 'sportswear').map((node) => node.key), [
    'beachwear',
    'fitness-gym-woman',
    'sportswear--shirts',
  ]);
  assert.deepEqual(foldersForCategory(value, 'football').map((node) => node.key), ['football--tw-medias']);
  assert.deepEqual(
    categoryAudiences(value, 'sportswear').map((row) => row.target),
    ['/shop/sportswear?audience=men'],
  );
  const dropped = structuredClone(value);
  const sport = dropped.nodes.find((node) => node.key === 'sportswear');
  assert.ok(sport);
  sport.audiences = [...sport.audiences, { id: 'sportswear--nope', label: { en: 'Nope', fr: 'Nope' }, count: 1, target: '/shop/sportswear?audience=Men' }];
  assert.equal(categoryAudiences(dropped, 'sportswear').some((row) => row.id === 'sportswear--nope'), false);
});

test('menu trail follows tile links', () => {
  const level = menuLevel(feed(), 'man', []);
  assert.ok(level);
  assert.equal(level.trail[0].key, 'man');
  assert.deepEqual(level.nodes.map((node) => node.key), ['beachwear', 'athletes-combat']);
  assert.equal(menuLevel(feed(), 'missing', []), null);
});

test('product line is kept as plain text', () => {
  const lines = lineByCode(feed());
  assert.equal(lines?.get('PACK-25'), 'Training cones');
  assert.equal(lines?.has('SHOE-1'), false);
});

test('checkout display uses feed shipping, per-country VAT, and drops unknown shipping keys', () => {
  const display = checkoutDisplay(feed().checkout, 'fr');
  assert.deepEqual(display.shipping.map((row) => [row.id, row.cost, row.label]), [
    ['standard', 100, 'Standard (5-8 jours)'],
    ['express', 150, 'Express (2-3 jours)'],
    ['pickup', 0, 'Retrait au hub'],
  ]);
  assert.equal(display.eurPerNad, 0.05);
  assert.deepEqual(
    display.countries.map((row) => [row.code, row.name, row.vatPercent]),
    [
      ['NA', 'Namibia', 15],
      ['ZA', 'South Africa', 15],
      ['FR', 'France', 20],
      ['DE', 'Germany', 19],
      ['FI', 'Finland', 25.5],
      ['XK', 'Kosovo', 18],
    ],
  );
  assert.equal(vatPercentForCountry(display, 'France'), 20);
  assert.equal(vatPercentForCountry(display, 'Finland'), 25.5);
  assert.equal(vatPercentForCountry(display, 'Botswana'), undefined);
  assert.equal(vatPercentForCountry(display, '__proto__'), undefined);
  assert.equal(formatApproxEur(304, 0.05), 'Approx. EUR 15.20');
});

test('flag on shipping comes only from the feed and sends nothing when missing', () => {
  assert.equal(shippingUnavailable(true, 0), true);
  assert.equal(shippingUnavailable(true, 0, true), false);
  assert.equal(shippingLoading(true, true, 0), true);
  assert.equal(shippingLoading(true, true, 2), false);
  assert.equal(shippingUnavailable(false, 0), false);
  assert.equal(selectedPaymentMethod(true, [], 'standard'), null);
  assert.equal(selectedPaymentMethod(true, [{ id: 'express' }], 'standard'), null);
  assert.equal(selectedPaymentMethod(true, [{ id: 'express' }], 'express'), 'express');
  assert.equal(selectedPaymentMethod(false, [], 'standard'), 'standard');
  const empty = checkoutDisplay({ ...feed().checkout, shipping: [] }, 'en');
  assert.deepEqual(empty.shipping, []);
  assert.equal(selectedPaymentMethod(true, empty.shipping, 'standard'), null);
});

test('flag on totals note is always shown and says when VAT is hidden', () => {
  assert.equal(flagOnTotalsNote(true), 'totals');
  assert.equal(flagOnTotalsNote(false), 'totals-and-vat-hidden');
  assert.match(en.checkout.totalsServer, /approximate/i);
  assert.match(en.checkout.totalsServer, /server confirms/i);
  assert.equal(en.checkout.vatHidden, 'VAT is not shown for this country.');
  assert.equal(en.checkout.shippingUnavailable, "Can't load shipping options, try again");
  assert.match(fr.checkout.totalsServer, /approximatifs/);
  assert.match(fr.checkout.vatHidden, /TVA/);
  assert.match(fr.checkout.shippingUnavailable, /livraison/);
});
