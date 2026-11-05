import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { memoryStore, resolveStorefront, STOREFRONT_CACHE_MAX_AGE_MS } from './cache.ts';
import { validateMobileStorefront } from './contract.ts';
import { athleteTileImage, displayUri, presentProduct } from './present.ts';
import type { MobileStorefront, StorefrontProduct } from './types.ts';

const CARD = 'https://www.rappisportshub.com/catalog-photos/100807.400.jpg?v=abc';
const OLD = 'https://v1.joma-sport.net/files/old.jpg';
const HUB = 'https://www.rappisportshub.com/brand/hub-sportswear.png?v=39f0fede66e6';

function fixture(): MobileStorefront {
  const parsed = validateMobileStorefront(JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8')));
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.value;
}

function product(partial: Partial<StorefrontProduct> & Pick<StorefrontProduct, 'code'>): StorefrontProduct {
  return {
    name: null,
    label: null,
    labelFr: null,
    isPack: false,
    pairCount: null,
    packLabel: null,
    price: null,
    priceLabel: null,
    cardImage: null,
    objectPosition: null,
    imageFit: null,
    images: [],
    line: null,
    category: null,
    subcategory: null,
    audience: null,
    ...partial,
  };
}

test('feed card, gallery, price, label and fit are used as the feed sends them', () => {
  const feed = product({
    code: '100807.400',
    name: 'Eventos T-Shirt LIME',
    label: 'Pack · 25 pcs',
    packLabel: 'Pack · 25 pcs',
    price: 2219,
    priceLabel: 'N$2,219',
    cardImage: CARD,
    images: [CARD, OLD],
    imageFit: 'cover',
    objectPosition: 'center',
  });
  const shown = presentProduct('en', 'na', feed, { name: 'Catalog name', imageUrl: OLD, images: [OLD], price: 10 }, false);
  assert.equal(shown.name, 'Eventos T-Shirt LIME');
  assert.equal(shown.badgeLabel, 'Pack · 25 pcs');
  assert.equal(shown.imageUrl, CARD);
  assert.equal(shown.fromFeedImage, true);
  assert.deepEqual(shown.images, [CARD, OLD]);
  assert.equal(shown.price, 2219);
  assert.equal(shown.priceLabel, 'N$2,219');
  assert.equal(shown.imageFit, 'cover');
  assert.equal(shown.contentPosition, 'center');
  assert.equal(displayUri(shown.imageUrl, shown.fromFeedImage), CARD);
});

test('a missing feed field keeps the catalog value, and rollback ignores the feed', () => {
  const feed = product({ code: 'SHOE-1', label: 'Runner', cardImage: null, images: [], price: null, priceLabel: null });
  const catalog = { name: 'Runner shoe', imageUrl: OLD, images: [OLD], price: 499 };
  const missing = presentProduct('en', 'na', feed, catalog, false);
  assert.equal(missing.name, 'Runner');
  assert.equal(missing.imageUrl, OLD);
  assert.equal(missing.fromFeedImage, false);
  assert.equal(missing.price, 499);
  assert.equal(missing.priceLabel, 'N$499');
  assert.equal(missing.imageFit, 'cover');
  const rolled = presentProduct('en', 'na', feed, catalog, true);
  assert.equal(rolled.name, 'Runner shoe');
  assert.equal(rolled.imageFit, 'contain');
  assert.equal(rolled.priceLabel, 'N$499');
  assert.equal(displayUri(OLD, false)?.startsWith('https://wsrv.nl/'), true);
});

test('athlete tiles use the audience row, then the audience node, and never the hub cover', () => {
  const men = 'https://www.rappisportshub.com/brand/audience-men.png?v=3';
  const women = 'https://www.rappisportshub.com/brand/audience-women.png?v=4';
  const kidsPhoto = 'https://www.rappisportshub.com/catalog-photos/kids.jpg?v=9';
  assert.equal(athleteTileImage({ audienceImage: men, nodeImage: HUB, hubCover: HUB }), men);
  assert.equal(athleteTileImage({ audienceImage: null, nodeImage: women, hubCover: HUB }), women);
  assert.equal(
    athleteTileImage({ audienceImage: null, nodeImage: `${HUB.split('?')[0]}?v=other`, hubCover: HUB }),
    null,
  );
  assert.equal(athleteTileImage({ audienceImage: kidsPhoto, nodeImage: HUB, hubCover: HUB }), kidsPhoto);
  assert.equal(athleteTileImage({ audienceImage: HUB, nodeImage: women, hubCover: HUB }), women);
});

test('every product and tile in the fixture matches the resolved feed fields', () => {
  const feed = fixture();
  let checked = 0;
  const mismatches: string[] = [];
  for (const item of feed.products) {
    const shown = presentProduct('en', 'na', item, undefined, false);
    checked += 1;
    if (item.cardImage && shown.imageUrl !== item.cardImage) mismatches.push(`${item.code} card`);
    if (item.images.length > 0 && shown.images.join('|') !== item.images.join('|')) mismatches.push(`${item.code} gallery`);
    if (item.name && shown.name !== item.name) mismatches.push(`${item.code} name`);
    if (item.price != null && shown.price !== item.price) mismatches.push(`${item.code} price`);
    if (item.priceLabel && shown.priceLabel !== item.priceLabel) mismatches.push(`${item.code} priceLabel`);
    if (shown.packLabel !== item.packLabel) mismatches.push(`${item.code} pack`);
    if (shown.imageFit !== (item.imageFit ?? 'cover')) mismatches.push(`${item.code} fit`);
  }
  for (const node of feed.nodes) {
    checked += 1;
    if (node.image && displayUri(node.image, true) !== node.image) mismatches.push(`${node.key} tile uri`);
  }
  assert.equal(mismatches.length, 0, mismatches.join(', '));
  assert.ok(checked > feed.products.length);
});

test('the next open replaces a cached price and photo', async () => {
  const store = memoryStore();
  const body = fixture();
  const first = structuredClone(body);
  const pack = first.products.find((item) => item.code === 'PACK-25');
  assert.ok(pack);
  pack.price = 100;
  pack.priceLabel = 'N$100';
  pack.cardImage = `${OLD}?v=1`;
  const host = 'https://www.rappisportshub.com';
  const opened = await resolveStorefront({
    production: false,
    apiUrl: host,
    store,
    now: 1_000,
    fetchFeed: async () => first,
  });
  assert.equal(opened?.products.find((item) => item.code === 'PACK-25')?.priceLabel, 'N$100');
  const second = structuredClone(body);
  const nextPack = second.products.find((item) => item.code === 'PACK-25');
  assert.ok(nextPack);
  nextPack.price = 250;
  nextPack.priceLabel = 'N$250';
  nextPack.cardImage = `${CARD}`;
  const refreshed = await resolveStorefront({
    production: false,
    apiUrl: host,
    store,
    now: 1_000 + STOREFRONT_CACHE_MAX_AGE_MS + 5,
    fetchFeed: async () => second,
  });
  const live = refreshed?.products.find((item) => item.code === 'PACK-25');
  assert.ok(live);
  const shown = presentProduct('en', 'na', live, { name: 'old', imageUrl: OLD, price: 100 }, false);
  assert.equal(shown.priceLabel, 'N$250');
  assert.equal(shown.price, 250);
  assert.equal(displayUri(shown.imageUrl, true), CARD);
});
