/**
 * Runs the app's product and tile selection over the live storefront feed
 * and compares it with the public catalog. App vs feed must match.
 * Feed vs website rows are reported. A website gap is explained when the app
 * rendered the feed field the server sent.
 */
import { writeFileSync } from 'node:fs';

import { validateMobileStorefront } from '../src/lib/storefront/contract.ts';
import { athleteTileImage, audienceSlugFromId, displayUri, presentProduct } from '../src/lib/storefront/present.ts';

const FEED_URL = 'https://www.rappisportshub.com/api/mobile/v1/storefront';
const CATALOG = 'https://www.rappisportshub.com/api/catalog';
const PAGE_SIZE = 200;

function sameFile(left, right) {
  if (!left || !right) return left === right;
  try {
    const a = new URL(left);
    const b = new URL(right);
    return a.origin === b.origin && a.pathname === b.pathname;
  } catch {
    return left === right;
  }
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function catalogProducts() {
  const products = [];
  let page = 1;
  let pageCount = 1;
  while (page <= pageCount) {
    const body = await fetchJson(`${CATALOG}?page=${page}&pageSize=${PAGE_SIZE}`);
    pageCount = body.pageCount || 1;
    for (const product of body.products ?? []) products.push(product);
    page += 1;
  }
  return products;
}

const raw = await fetchJson(FEED_URL);
const parsed = validateMobileStorefront(raw);
if (!parsed.ok) {
  console.error(parsed.reason);
  process.exit(1);
}
const feed = parsed.value;
const rawProducts = Array.isArray(raw.products) ? raw.products : [];
const kept = new Set(feed.products.map((item) => item.code));
const dropped = rawProducts.filter((item) => item && !kept.has(item.code)).map((item) => item.code);

const mismatches = [];
let checked = 0;
let matches = 0;

function expect(ok, message) {
  checked += 1;
  if (ok) matches += 1;
  else mismatches.push(message);
}

for (const item of feed.products) {
  const shown = presentProduct('en', 'na', item, undefined, false);
  expect(shown.imageUrl === (item.cardImage || undefined), `${item.code} card ${shown.imageUrl} != ${item.cardImage}`);
  expect(displayUri(shown.imageUrl, shown.fromFeedImage) === (item.cardImage || undefined), `${item.code} uri rewritten`);
  if (item.images.length > 0) {
    expect(shown.images.join('\n') === item.images.join('\n'), `${item.code} gallery order`);
  }
  if (item.name) expect(shown.name === item.name, `${item.code} name`);
  if (item.price != null) expect(shown.price === item.price, `${item.code} price`);
  if (item.priceLabel) expect(shown.priceLabel === item.priceLabel, `${item.code} priceLabel ${shown.priceLabel}`);
  expect(shown.packLabel === item.packLabel, `${item.code} packLabel`);
  expect(shown.imageFit === (item.imageFit ?? 'cover'), `${item.code} imageFit`);
  const audiences = ['men', 'women', 'kids'];
  if (item.audience && audiences.includes(item.audience)) {
    expect(shown.imageUrl === (item.cardImage || undefined), `${item.code} audience ${item.audience} card`);
  }
}

const byKey = new Map(feed.nodes.map((node) => [node.key, node]));
for (const node of feed.nodes) {
  expect(displayUri(node.image ?? undefined, true) === (node.image ?? undefined), `${node.key} tile uri`);
  expect(node.objectPosition === null || typeof node.objectPosition === 'string', `${node.key} objectPosition`);
}

let athleteChecked = 0;
for (const node of feed.nodes) {
  const hub = node.image;
  for (const row of node.audiences) {
    const slug = audienceSlugFromId(row.id);
    const audienceNode = [...byKey.values()].find(
      (item) => item.kind === 'audience' && (item.slug === slug || item.key === slug),
    );
    const image = athleteTileImage({
      audienceImage: row.image,
      nodeImage: audienceNode?.image ?? null,
      hubCover: hub,
    });
    athleteChecked += 1;
    expect(image == null || !sameFile(image, hub), `${row.id} athlete image is the hub cover`);
    if (row.image && !sameFile(row.image, hub)) expect(image === row.image, `${row.id} ignored audiences[].image`);
  }
}

const site = await catalogProducts();
const feedByCode = new Map(feed.products.map((item) => [item.code, item]));
let siteChecked = 0;
let sitePriceMatch = 0;
let siteLeadPhotoMatch = 0;
let explainedLeadGaps = 0;
const siteGaps = [];
for (const product of site) {
  const item = feedByCode.get(product.code);
  if (!item) continue;
  siteChecked += 1;
  const shown = presentProduct(
    'en',
    'na',
    item,
    { name: product.displayName || product.name, imageUrl: product.imageUrl, images: product.images, price: product.price },
    false,
  );
  const priceOk = shown.price === product.price;
  if (priceOk) sitePriceMatch += 1;
  const leadOk = !product.imageUrl || sameFile(shown.imageUrl, product.imageUrl);
  if (leadOk) siteLeadPhotoMatch += 1;
  else if (shown.imageUrl === item.cardImage || sameFile(shown.imageUrl, item.cardImage)) {
    explainedLeadGaps += 1;
    if (siteGaps.length < 12 || product.code === '100807.400') {
      siteGaps.push({
        code: product.code,
        app: shown.imageUrl,
        siteLead: product.imageUrl,
        feedCardImage: item.cardImage,
        reason: 'App rendered the feed cardImage. The live feed card is not the website listing lead yet.',
      });
    }
  } else if (siteGaps.length < 20) {
    siteGaps.push({
      code: product.code,
      app: shown.imageUrl,
      siteLead: product.imageUrl,
      feedCardImage: item.cardImage,
      reason: 'App photo is neither the feed card nor the website lead.',
    });
  }
}

const sportswear = feed.nodes.find((node) => node.key === 'sportswear');
const athletePreview = (sportswear?.audiences ?? []).map((row) => {
  const slug = audienceSlugFromId(row.id);
  const audienceNode = feed.nodes.find((node) => node.kind === 'audience' && (node.slug === slug || node.key === slug));
  return {
    id: row.id,
    audienceImage: row.image,
    nodeImage: audienceNode?.image ?? null,
    shown: athleteTileImage({
      audienceImage: row.image,
      nodeImage: audienceNode?.image ?? null,
      hubCover: sportswear?.image ?? null,
    }),
  };
});

const report = {
  feedVersion: feed.version,
  productsInFeed: rawProducts.length,
  productsResolved: feed.products.length,
  droppedCodes: dropped,
  tiles: feed.nodes.length,
  athleteRows: athleteChecked,
  checked,
  matches,
  mismatches: mismatches.length,
  mismatchSample: mismatches.slice(0, 30),
  siteRows: site.length,
  siteCompared: siteChecked,
  sitePriceMatch,
  siteLeadPhotoMatch,
  explainedLeadGaps,
  unexplainedSiteGaps: siteChecked - siteLeadPhotoMatch - explainedLeadGaps,
  siteGapSample: siteGaps,
  sportswearAthletes: athletePreview,
  objectPositionOnNodes: feed.nodes.filter((node) => node.objectPosition).length,
  audienceImages: feed.nodes.reduce((sum, node) => sum + node.audiences.filter((row) => row.image).length, 0),
  cacheMaxAgeMs: 60_000,
};
writeFileSync('/tmp/feed-render-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (mismatches.length > 0 || dropped.length > 0 || report.unexplainedSiteGaps > 0) process.exit(1);
