/**
 * Writes one target map from the pinned web feed table, the namespaced list, and the sub-link list.
 *
 * data/web-pin.json is the only sha pin. The generated header and this check read it.
 * feedTargets is feedTargetTable() and namespacedFeedTargets().
 * subLinks is data/storefront-sub-links.json.
 * data/feed-target-table.json is { id, href } in map order at the feedTargets sha.
 * data/kept-feed-routes.json locks the app route for every static path that already had one.
 *
 * Static hrefs come first, then namespaced, then sub-links.
 * A href that is already present is kept once when the route matches and rejected when it does not.
 * Keys are exact href strings. Nothing here parses a query at runtime.
 *
 * npm run gen:feed-targets
 * npm run check:feed-targets
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const WEB_PIN_PATH = path.join(ROOT, 'data', 'web-pin.json');
export const FEED_TABLE_PATH = path.join(ROOT, 'data', 'feed-target-table.json');
export const NAMESPACED_JSON_PATH = path.join(ROOT, 'data', 'namespaced-feed-targets.json');
export const SUB_LINK_JSON_PATH = path.join(ROOT, 'data', 'storefront-sub-links.json');
export const KEPT_ROUTES_PATH = path.join(ROOT, 'data', 'kept-feed-routes.json');
export const FEED_GENERATED_PATH = path.join(ROOT, 'src', 'lib', 'storefront', 'feedTargets.generated.ts');

const SHA = /^[0-9a-f]{40}$/;
const STATIC_ID = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NAMESPACED_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*--[a-z0-9]+(?:-[a-z0-9]+)*$/;
const AUDIENCE = new Set(['men', 'women', 'kids']);
const SHOP_MENUS = {
  '/shop/balls-bags': 'accessories',
  '/shop/kids': 'children',
  '/shop/men': 'man',
  '/shop/women': 'woman',
  '/shop/shoes': 'footwear',
};
const SHOP_CATEGORIES = new Set(['basketball', 'cricket', 'football', 'rugby', 'swimming']);
const AUDIENCE_HUBS = { '/shop/kids': 'kids', '/shop/men': 'men', '/shop/women': 'women' };

function gitPath(gitPath) {
  return `HEAD:${gitPath}`;
}

function committedText(repoPath) {
  const spec = gitPath(repoPath);
  try {
    execFileSync('git', ['cat-file', '-e', spec], { cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'] });
  } catch {
    return null;
  }
  return execFileSync('git', ['show', spec], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** @param {string} text */
export function readWebPin(text) {
  const pin = JSON.parse(text);
  if (pin === null || typeof pin !== 'object' || Array.isArray(pin)) throw new Error('web pin must be an object');
  const keys = Object.keys(pin);
  const allowed = ['feedTargets', 'subLinks'];
  if (keys.length !== allowed.length || allowed.some((key) => !keys.includes(key))) {
    throw new Error('web pin must contain feedTargets and subLinks');
  }
  for (const key of allowed) {
    if (typeof pin[key] !== 'string' || !SHA.test(pin[key])) {
      throw new Error(`web pin ${key} must be a 40 character sha`);
    }
  }
  return pin;
}

/**
 * App route for one exact href. Paths that already had a route stay on that route.
 * A new /shop/<hub>?group= or ?audience= path uses the namespaced shape.
 * @param {string} href
 */
export function routeForHref(href) {
  const url = new URL(href, 'https://rappi.local');
  const pathName = url.pathname;
  const params = [...url.searchParams.keys()];
  if (params.length === 0) {
    if (pathName === '/') return { screen: 'home' };
    if (pathName === '/promotions') return { screen: 'menu', menu: 'outlet', path: [] };
    if (pathName === '/teamwear') return { screen: 'menu', menu: 'teams', path: [] };
    if (pathName.startsWith('/category/')) {
      const slug = pathName.slice('/category/'.length);
      if (!slug || slug.includes('/')) throw new Error(`no route for ${href}`);
      return { screen: 'category', slug };
    }
    if (SHOP_MENUS[pathName]) return { screen: 'menu', menu: SHOP_MENUS[pathName], path: [] };
    if (pathName.startsWith('/shop/')) {
      const hub = pathName.slice('/shop/'.length);
      if (SHOP_CATEGORIES.has(hub)) return { screen: 'category', slug: hub };
    }
    throw new Error(`no route for ${href}`);
  }
  if (params.length === 1 && params[0] === 'view' && pathName === '/teamwear' && url.searchParams.get('view') === 'kits') {
    return { screen: 'menu', menu: 'kits', path: [] };
  }
  if (params.length === 1 && params[0] === 'q') {
    const hub = pathName.startsWith('/shop/') ? pathName.slice('/shop/'.length) : '';
    const query = url.searchParams.get('q');
    if (!hub || hub.includes('/') || !query) throw new Error(`no route for ${href}`);
    return { screen: 'group', cat: hub, group: `q:${query}`, leaf: true };
  }
  if (params.length === 1 && params[0] === 'audience' && pathName.startsWith('/shop/')) {
    const hub = pathName.slice('/shop/'.length);
    const audience = url.searchParams.get('audience');
    if (!hub || hub.includes('/') || !audience) throw new Error(`no route for ${href}`);
    return { screen: 'group', cat: hub, group: 'all', audience, leaf: true };
  }
  const group = url.searchParams.get('group');
  const audience = url.searchParams.get('audience');
  if (group && params.every((key) => key === 'group' || key === 'audience')) {
    if (pathName === '/teamwear' || pathName === '/promotions') {
      if (audience) throw new Error(`no route for ${href}`);
      return { screen: 'group', cat: 'sportswear', group, leaf: true };
    }
    if (pathName.startsWith('/shop/')) {
      const hub = pathName.slice('/shop/'.length);
      if (!hub || hub.includes('/')) throw new Error(`no route for ${href}`);
      if (!audience && AUDIENCE_HUBS[pathName]) {
        return { screen: 'group', cat: 'sportswear', group, audience: AUDIENCE_HUBS[pathName], leaf: true };
      }
      if (audience) return { screen: 'group', cat: hub, group, audience, leaf: true };
      return { screen: 'group', cat: hub, group, leaf: true };
    }
  }
  throw new Error(`no route for ${href}`);
}

/** @param {Record<string, unknown>} route */
export function routeText(route) {
  if (route.screen === 'home') return '{ screen: "home" }';
  if (route.screen === 'menu') {
    return `{ screen: "menu", menu: ${JSON.stringify(route.menu)}, path: [] }`;
  }
  if (route.screen === 'category') return `{ screen: "category", slug: ${JSON.stringify(route.slug)} }`;
  const audience = route.audience ? `, audience: ${JSON.stringify(route.audience)}` : '';
  return `{ screen: "group", cat: ${JSON.stringify(route.cat)}, group: ${JSON.stringify(route.group)}${audience}, leaf: true }`;
}

function staticFail(index, message) {
  throw new Error(`feed target row ${index}: ${message}`);
}

/** @param {unknown} rows */
export function staticTargetEntries(rows) {
  if (!Array.isArray(rows)) throw new Error('feed target table must be a JSON array');
  const seenIds = new Set();
  const entries = [];
  rows.forEach((row, index) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) staticFail(index, 'must be an object');
    const keys = Object.keys(row);
    if (keys.length !== 2 || !keys.includes('id') || !keys.includes('href')) staticFail(index, 'must be id and href');
    if (typeof row.id !== 'string' || !STATIC_ID.test(row.id)) staticFail(index, 'id must be a fixed id');
    if (typeof row.href !== 'string' || row.href.length === 0) staticFail(index, 'href must be a string');
    if (seenIds.has(row.id)) staticFail(index, `duplicate id ${row.id}`);
    seenIds.add(row.id);
    const route = routeForHref(row.href);
    entries.push({ href: row.href, route: routeText(route) });
  });
  return entries;
}

function namespacedFail(index, message) {
  throw new Error(`namespaced target row ${index}: ${message}`);
}

/** @param {unknown} rows */
export function namespacedTargetEntries(rows) {
  if (!Array.isArray(rows)) throw new Error('namespaced feed targets must be a JSON array');
  const seenIds = new Set();
  const seenHrefs = new Set();
  const entries = [];
  rows.forEach((row, index) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) namespacedFail(index, 'must be an object');
    const keys = Object.keys(row);
    for (const key of keys) {
      if (key !== 'id' && key !== 'href') namespacedFail(index, `unexpected key ${key}`);
    }
    if (typeof row.id !== 'string' || !NAMESPACED_ID.test(row.id)) namespacedFail(index, 'id must be hub--leaf');
    if (typeof row.href !== 'string') namespacedFail(index, 'href must be a string');
    const [hub, leaf] = row.id.split('--');
    if (!SLUG.test(hub) || !SLUG.test(leaf)) namespacedFail(index, 'hub and leaf must be lowercase slugs');
    const href = AUDIENCE.has(leaf)
      ? `/shop/${hub}?audience=${leaf}`
      : `/shop/${hub}?group=${encodeURIComponent(leaf)}`;
    if (row.href !== href) namespacedFail(index, `href must be ${href}`);
    if (seenIds.has(row.id)) namespacedFail(index, `duplicate id ${row.id}`);
    if (seenHrefs.has(row.href)) namespacedFail(index, `duplicate href ${row.href}`);
    seenIds.add(row.id);
    seenHrefs.add(row.href);
    const fromRule = routeText(routeForHref(row.href));
    const fromTemplate = AUDIENCE.has(leaf)
      ? `{ screen: "group", cat: ${JSON.stringify(hub)}, group: "all", audience: ${JSON.stringify(leaf)}, leaf: true }`
      : `{ screen: "group", cat: ${JSON.stringify(hub)}, group: ${JSON.stringify(leaf)}, leaf: true }`;
    if (fromRule !== fromTemplate) namespacedFail(index, `route does not match ${row.href}`);
    entries.push({ href: row.href, route: fromRule });
  });
  return entries;
}

const SUB_LINK_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SUB_LINK_REQUIRED = ['hub', 'sub', 'label', 'href', 'count'];

function subLinkFail(index, message) {
  throw new Error(`sub-link row ${index}: ${message}`);
}

function subLinkSlug(index, field, value) {
  if (typeof value !== 'string' || !SUB_LINK_SLUG.test(value)) subLinkFail(index, `${field} must be a lowercase slug`);
  return value;
}

/** @param {unknown} rows */
export function subLinkTargetEntries(rows) {
  if (!Array.isArray(rows)) throw new Error('storefront sub-links must be a JSON array');
  const seen = new Set();
  const entries = [];
  rows.forEach((row, index) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) subLinkFail(index, 'must be an object');
    const keys = Object.keys(row);
    for (const key of keys) {
      if (key !== 'group' && !SUB_LINK_REQUIRED.includes(key)) subLinkFail(index, `unexpected key ${key}`);
    }
    for (const key of SUB_LINK_REQUIRED) {
      if (!Object.prototype.hasOwnProperty.call(row, key)) subLinkFail(index, `missing ${key}`);
    }
    const hub = subLinkSlug(index, 'hub', row.hub);
    const sub = subLinkSlug(index, 'sub', row.sub);
    let group;
    if (Object.prototype.hasOwnProperty.call(row, 'group') && row.group !== null) {
      group = subLinkSlug(index, 'group', row.group);
    }
    if (typeof row.label !== 'string' || row.label.length === 0) subLinkFail(index, 'label must be a non-empty string');
    if (typeof row.href !== 'string') subLinkFail(index, 'href must be a string');
    if (!Number.isInteger(row.count) || row.count < 0) subLinkFail(index, 'count must be a non-negative integer');
    const href = group ? `/shop/${hub}?sub=${sub}&group=${group}` : `/shop/${hub}?sub=${sub}`;
    if (row.href !== href) subLinkFail(index, `href must be ${href}`);
    if (seen.has(href)) subLinkFail(index, `duplicate href ${href}`);
    seen.add(href);
    const folder = group ? `sub:${sub}@${group}` : `sub:${sub}`;
    const route = `{ screen: "group", cat: ${JSON.stringify(hub)}, group: ${JSON.stringify(folder)}, leaf: true }`;
    entries.push({ href, route });
  });
  return entries;
}

/**
 * @param {{ href: string, route: string }[]} entries
 * @param {Map<string, string>} seen
 * @param {string[]} lines
 * @param {string} source
 */
function appendEntries(entries, seen, lines, source) {
  for (const entry of entries) {
    const previous = seen.get(entry.href);
    if (previous === undefined) {
      seen.set(entry.href, entry.route);
      lines.push(`  [${JSON.stringify(entry.href)}, ${entry.route}],`);
      continue;
    }
    if (previous === entry.route) continue;
    throw new Error(`${source} href ${entry.href} duplicates an earlier feed target with a different route`);
  }
}

/**
 * @param {string} pinText
 * @param {unknown} tableRows
 * @param {unknown} namespacedRows
 * @param {unknown} keptRows
 * @param {unknown} subLinkRows
 */
export function renderFeedTargets(pinText, tableRows, namespacedRows, keptRows, subLinkRows) {
  const pin = readWebPin(pinText);
  assertKeptRoutes(tableRows, keptRows);
  const seen = new Map();
  const lines = [];
  appendEntries(staticTargetEntries(tableRows), seen, lines, 'static');
  appendEntries(namespacedTargetEntries(namespacedRows), seen, lines, 'namespaced');
  appendEntries(subLinkTargetEntries(subLinkRows), seen, lines, 'sub-link');
  return `/**
 * GENERATED by scripts/gen-feed-targets.mjs. Do not edit by hand.
 * Pin: data/web-pin.json feedTargets ${pin.feedTargets}, subLinks ${pin.subLinks}.
 * Static source: data/feed-target-table.json from feedTargetTable() at the feedTargets sha.
 * Namespaced source: data/namespaced-feed-targets.json from namespacedFeedTargets() at the feedTargets sha.
 * Sub-link source: data/storefront-sub-links.json at the subLinks sha.
 * One map. Static hrefs come first, then namespaced hrefs, then sub-link hrefs.
 * A repeated href is kept once when the route matches and rejected when it does not.
 * Keys are exact href strings. Look up with Map.get. Labels and counts are not included.
 */
import type { StorefrontRoute } from "./types.ts";

export const FEED_TARGETS: ReadonlyMap<string, StorefrontRoute> = new Map<string, StorefrontRoute>([
${lines.join('\n')}
]);
`;
}

/** @param {unknown} tableRows @param {unknown} keptRows */
export function assertKeptRoutes(tableRows, keptRows) {
  if (!Array.isArray(tableRows)) throw new Error('feed target table must be a JSON array');
  if (!Array.isArray(keptRows)) throw new Error('kept feed routes must be a JSON array');
  const hrefs = new Set(tableRows.map((row) => (row && typeof row === 'object' ? row.href : null)));
  for (const row of keptRows) {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) throw new Error('kept route must be an object');
    if (typeof row.href !== 'string' || row.route === null || typeof row.route !== 'object') {
      throw new Error('kept route must have href and route');
    }
    if (!hrefs.has(row.href)) continue;
    const built = routeForHref(row.href);
    if (JSON.stringify(built) !== JSON.stringify(row.route)) {
      throw new Error(`kept route changed for ${row.href}`);
    }
  }
}

/**
 * @param {string} pinWorking
 * @param {string | null} pinCommitted
 * @param {string} tableWorking
 * @param {string | null} tableCommitted
 * @param {string} namespacedWorking
 * @param {string | null} namespacedCommitted
 * @param {string} keptWorking
 * @param {string | null} keptCommitted
 * @param {string} subWorking
 * @param {string | null} subCommitted
 * @param {string} generatedText
 * @returns {string | null}
 */
export function feedTargetCheckFailure(
  pinWorking,
  pinCommitted,
  tableWorking,
  tableCommitted,
  namespacedWorking,
  namespacedCommitted,
  keptWorking,
  keptCommitted,
  subWorking,
  subCommitted,
  generatedText,
) {
  try {
    const pin = readWebPin(pinWorking);
    if (pinCommitted !== null && pinWorking !== pinCommitted) {
      return 'data/web-pin.json has drifted from the committed pin.';
    }
    if (tableCommitted !== null && tableWorking !== tableCommitted) {
      return `data/feed-target-table.json has drifted from the committed copy (rappi-webapp ${pin.feedTargets}).`;
    }
    if (namespacedCommitted !== null && namespacedWorking !== namespacedCommitted) {
      return `data/namespaced-feed-targets.json has drifted from the committed copy (rappi-webapp ${pin.feedTargets}).`;
    }
    if (keptCommitted !== null && keptWorking !== keptCommitted) {
      return 'data/kept-feed-routes.json has drifted from the committed copy.';
    }
    if (subCommitted !== null && subWorking !== subCommitted) {
      return `data/storefront-sub-links.json has drifted from the committed copy (rappi-webapp ${pin.subLinks}).`;
    }
    const rendered = renderFeedTargets(
      pinCommitted ?? pinWorking,
      JSON.parse(tableCommitted ?? tableWorking),
      JSON.parse(namespacedCommitted ?? namespacedWorking),
      JSON.parse(keptCommitted ?? keptWorking),
      JSON.parse(subCommitted ?? subWorking),
    );
    if (generatedText !== rendered) {
      return 'feedTargets.generated.ts does not match the pinned feed target lists. Run npm run gen:feed-targets.';
    }
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function main() {
  const check = process.argv.includes('--check');
  const pinWorking = readFileSync(WEB_PIN_PATH, 'utf8');
  const tableWorking = readFileSync(FEED_TABLE_PATH, 'utf8');
  const namespacedWorking = readFileSync(NAMESPACED_JSON_PATH, 'utf8');
  const keptWorking = readFileSync(KEPT_ROUTES_PATH, 'utf8');
  const subWorking = readFileSync(SUB_LINK_JSON_PATH, 'utf8');
  if (check) {
    const failure = feedTargetCheckFailure(
      pinWorking,
      committedText('data/web-pin.json'),
      tableWorking,
      committedText('data/feed-target-table.json'),
      namespacedWorking,
      committedText('data/namespaced-feed-targets.json'),
      keptWorking,
      committedText('data/kept-feed-routes.json'),
      subWorking,
      committedText('data/storefront-sub-links.json'),
      readFileSync(FEED_GENERATED_PATH, 'utf8'),
    );
    if (failure) {
      process.stderr.write(`${failure}\n`);
      process.exit(1);
    }
    return;
  }
  writeFileSync(
    FEED_GENERATED_PATH,
    renderFeedTargets(
      pinWorking,
      JSON.parse(tableWorking),
      JSON.parse(namespacedWorking),
      JSON.parse(keptWorking),
      JSON.parse(subWorking),
    ),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
