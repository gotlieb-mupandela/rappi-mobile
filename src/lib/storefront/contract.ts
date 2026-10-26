/**
 * Feed contract for GET /api/mobile/v1/storefront.
 * Types and target paths match rappi-webapp PR 98 at ac533ee05c521c0000dc06e408dc6c25aec30d50.
 * span, tone, slug, and audiences match PR 105 at 7700b1d9ce42c15eda95da89e5d73445beea6852.
 * One later web push may adjust how `line` is chosen. This app reads `line` only and never `item`.
 * The target table lives in targets.ts. The released image-map route is GET /api/mobile/storefront.
 */
import { feedImageUrl } from './images.ts';
import type {
  LocalizedText,
  MobileStorefront,
  StorefrontAudienceRef,
  StorefrontCheckout,
  StorefrontCounts,
  StorefrontCountry,
  StorefrontLanguage,
  StorefrontNode,
  StorefrontNodeKind,
  StorefrontProduct,
  StorefrontShipping,
} from './types.ts';

export const STOREFRONT_PATH = '/api/mobile/v1/storefront';

export const STORE_HOST = 'www.rappisportshub.com';

export type { StorefrontRoute } from './types.ts';
export { HIDDEN_FEED_TARGETS, TARGET_ALIASES, TARGET_ALIAS_KEYS, resolveTarget } from './targets.ts';

export type StorefrontValidation =
  | { ok: true; value: MobileStorefront }
  | { ok: false; reason: string };

const KEY = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;
const CODE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,64}$/;
const COUNTRY = /^[A-Z]{2}$/;
const KINDS = new Set<StorefrontNodeKind>(['menu', 'folder', 'category', 'audience', 'tile']);
const AUDIENCE_SLUGS = new Set(['men', 'women', 'kids']);

const LIMITS = {
  nodes: 5000,
  menus: 50,
  categories: 100,
  tiles: 800,
  products: 20000,
  images: 12,
  shipping: 20,
  countries: 300,
  countryName: 80,
  title: 200,
  description: 600,
  label: 300,
  line: 120,
  meta: 80,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isPlainText(value: string, max: number): boolean {
  return value.length <= max && !/[\u0000-\u001F\u007F]/.test(value);
}

function readCopy(value: unknown, max: number, requireEn: boolean): LocalizedText | null {
  if (!isRecord(value)) return null;
  if (typeof value.en !== 'string' || typeof value.fr !== 'string') return null;
  if (!isPlainText(value.en, max) || !isPlainText(value.fr, max)) return null;
  if (requireEn && value.en.trim() === '') return null;
  return { en: value.en, fr: value.fr };
}

function readKeyList(value: unknown, limit: number, duplicates: 'reject' | 'skip'): string[] | null {
  if (!Array.isArray(value) || value.length > limit) return null;
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string' || !KEY.test(item)) return null;
    if (seen.has(item)) {
      if (duplicates === 'reject') return null;
      continue;
    }
    seen.add(item);
    keys.push(item);
  }
  return keys;
}

function readNode(value: unknown): StorefrontNode | null {
  if (!isRecord(value)) return null;
  if (typeof value.key !== 'string' || !KEY.test(value.key)) return null;
  if (typeof value.kind !== 'string' || !KINDS.has(value.kind as StorefrontNodeKind)) return null;
  if (value.parent !== null && (typeof value.parent !== 'string' || !KEY.test(value.parent))) return null;
  if (typeof value.order !== 'number' || !Number.isInteger(value.order) || value.order < -1_000_000 || value.order > 1_000_000) {
    return null;
  }
  if (typeof value.target !== 'string' || value.target.length === 0 || value.target.length > 180) return null;
  if (typeof value.hidden !== 'boolean') return null;
  if (typeof value.count !== 'number' || !Number.isInteger(value.count) || value.count < 0 || value.count > 1_000_000) return null;
  if (value.group !== null && (typeof value.group !== 'string' || !KEY.test(value.group))) return null;
  const tiles = readKeyList(value.tiles, LIMITS.tiles, 'skip');
  if (!tiles) return null;
  const title = readCopy(value.title, LIMITS.title, true);
  const description = readCopy(value.description, LIMITS.description, false);
  if (!title || !description) return null;
  if (value.image !== null && value.image !== undefined && typeof value.image !== 'string') return null;
  const span = readSpan(value.span);
  const tone = readTone(value.tone);
  const slug = readSlug(value.slug);
  const audiences = readAudiences(value.audiences);
  if (span === undefined || tone === undefined || slug === undefined || !audiences) return null;
  const kind = value.kind as StorefrontNodeKind;
  if (kind !== 'audience' && slug !== null) return null;
  return {
    key: value.key,
    kind,
    parent: value.parent,
    order: value.order,
    target: value.target,
    image: feedImageUrl(value.image),
    title,
    description,
    hidden: value.hidden,
    count: value.count,
    group: value.group,
    tiles,
    span,
    tone,
    slug,
    audiences,
  };
}

/** Missing span is null. A value outside 1 or 2 hides the node. */
function readSpan(value: unknown): 1 | 2 | null | undefined {
  if (value === undefined || value === null) return null;
  if (value === 1 || value === 2) return value;
  return undefined;
}

/** Missing tone is null. Any other string hides the node. */
function readTone(value: unknown): 'dark' | 'light' | null | undefined {
  if (value === undefined || value === null) return null;
  if (value === 'dark' || value === 'light') return value;
  return undefined;
}

/** Missing slug is null. Only men, women, and kids are audience slugs. */
function readSlug(value: unknown): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' && AUDIENCE_SLUGS.has(value)) return value;
  return undefined;
}

/** Missing audiences is an empty list. A bad row is omitted. A non-array hides the node. */
function readAudiences(value: unknown): StorefrontAudienceRef[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const rows: StorefrontAudienceRef[] = [];
  for (const item of value) {
    const row = readAudience(item);
    if (row) rows.push(row);
  }
  return rows;
}

function readAudience(value: unknown): StorefrontAudienceRef | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || !KEY.test(value.id)) return null;
  if (typeof value.target !== 'string' || value.target.length === 0 || value.target.length > 180) return null;
  if (typeof value.count !== 'number' || !Number.isInteger(value.count) || value.count <= 0 || value.count > 1_000_000) return null;
  const label = readCopy(value.label, LIMITS.title, true);
  if (!label || label.fr.trim() === '') return null;
  return { id: value.id, label, count: value.count, target: value.target };
}

function readNodes(value: unknown, limit: number): StorefrontNode[] | null {
  if (!Array.isArray(value) || value.length > limit) return null;
  const nodes: StorefrontNode[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const node = readNode(item);
    if (!node) continue;
    if (seen.has(node.key)) return null;
    seen.add(node.key);
    nodes.push(node);
  }
  return nodes;
}

function saneMoney(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return null;
  return value;
}

function readCheckout(value: unknown): StorefrontCheckout | null {
  if (!isRecord(value) || !Array.isArray(value.shipping) || value.shipping.length > LIMITS.shipping) return null;
  const shipping: StorefrontShipping[] = [];
  const seen = new Set<string>();
  for (const item of value.shipping) {
    if (!isRecord(item)) return null;
    if (typeof item.key !== 'string' || !KEY.test(item.key) || seen.has(item.key)) return null;
    const title = readCopy(item.title, LIMITS.title, true);
    const amountNad = saneMoney(item.amountNad, 0, 1_000_000);
    if (!title || amountNad === null) return null;
    seen.add(item.key);
    shipping.push({ key: item.key, title, amountNad });
  }
  if (!Array.isArray(value.countries) || value.countries.length > LIMITS.countries) return null;
  const countries: StorefrontCountry[] = [];
  const seenCodes = new Set<string>();
  for (const item of value.countries) {
    const country = readCountry(item);
    if (!country || seenCodes.has(country.code)) return null;
    seenCodes.add(country.code);
    countries.push(country);
  }
  const eurPerNad = saneMoney(value.eurPerNad, Number.MIN_VALUE, 100);
  if (eurPerNad === null || eurPerNad <= 0) return null;
  return { shipping, countries, eurPerNad };
}

function readCountry(value: unknown): StorefrontCountry | null {
  if (!isRecord(value)) return null;
  if (typeof value.code !== 'string' || !COUNTRY.test(value.code)) return null;
  if (typeof value.name !== 'string' || !isPlainText(value.name, LIMITS.countryName) || value.name.trim() === '') return null;
  const vatRate = saneMoney(value.vatRate, 0, 1);
  if (vatRate === null) return null;
  return { code: value.code, name: value.name.trim(), vatRate };
}

function readOptionalMeta(value: unknown): { ok: true; value: string | null } | null {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== 'string' || !isPlainText(value, LIMITS.meta)) return null;
  if (value.includes('://') || value.startsWith('//') || value.startsWith('/')) return null;
  return { ok: true, value };
}

function readProduct(value: unknown): StorefrontProduct | null {
  if (!isRecord(value)) return null;
  if (typeof value.code !== 'string' || !CODE.test(value.code)) return null;
  if (value.label !== null && typeof value.label !== 'string') return null;
  if (typeof value.label === 'string' && !isPlainText(value.label, LIMITS.label)) return null;
  let labelFr: string | null | undefined;
  if ('labelFr' in value && value.labelFr !== undefined) {
    if (value.labelFr === null) labelFr = null;
    else if (typeof value.labelFr === 'string' && isPlainText(value.labelFr, LIMITS.label)) labelFr = value.labelFr;
    else return null;
  }
  const label = value.label === null ? null : value.label;
  if (label === null) labelFr = null;
  if (typeof value.isPack !== 'boolean') return null;
  if (value.pairCount !== null && (typeof value.pairCount !== 'number' || !Number.isInteger(value.pairCount) || value.pairCount < 0 || value.pairCount > 10000)) {
    return null;
  }
  if (!Array.isArray(value.images)) return null;
  const line = value.line === undefined ? null : value.line;
  if (line !== null && (typeof line !== 'string' || !isPlainText(line, LIMITS.line))) return null;
  const category = readOptionalMeta(value.category);
  const subcategory = readOptionalMeta(value.subcategory);
  const audience = readOptionalMeta(value.audience);
  if (!category || !subcategory || !audience) return null;
  const images: string[] = [];
  for (const image of value.images) {
    if (images.length >= LIMITS.images) break;
    const clean = feedImageUrl(image);
    if (clean) images.push(clean);
  }
  return {
    code: value.code,
    label,
    labelFr,
    isPack: value.isPack,
    pairCount: value.pairCount,
    cardImage: feedImageUrl(value.cardImage),
    images,
    line,
    category: category.value,
    subcategory: subcategory.value,
    audience: audience.value,
  };
}

export function validateMobileStorefront(value: unknown): StorefrontValidation {
  if (!isRecord(value)) return { ok: false, reason: 'Feed is not an object.' };
  if (typeof value.version !== 'string' || value.version.length < 1 || value.version.length > 128 || /[\s\u0000-\u001F\u007F]/.test(value.version)) {
    return { ok: false, reason: 'Feed version is missing.' };
  }
  const nodes = readNodes(value.nodes, LIMITS.nodes);
  const menus = readKeyList(value.menus, LIMITS.menus, 'reject');
  const categoryOrder = readKeyList(value.categoryOrder, LIMITS.categories, 'reject');
  if (!nodes || !menus || !categoryOrder) return { ok: false, reason: 'Feed navigation is malformed.' };
  const checkout = readCheckout(value.checkout);
  if (!checkout) return { ok: false, reason: 'Feed checkout display is malformed.' };
  const counts = readCounts(value.counts);
  if (!counts) return { ok: false, reason: 'Feed counts are malformed.' };
  if (!Array.isArray(value.products) || value.products.length > LIMITS.products) {
    return { ok: false, reason: 'Feed products are malformed.' };
  }
  const products: StorefrontProduct[] = [];
  const seen = new Set<string>();
  for (const item of value.products) {
    const product = readProduct(item);
    if (!product) continue;
    if (seen.has(product.code)) return { ok: false, reason: 'Feed products are malformed.' };
    seen.add(product.code);
    products.push(product);
  }
  return { ok: true, value: { version: value.version, nodes, menus, categoryOrder, products, checkout, counts } };
}

function readCounts(value: unknown): StorefrontCounts | null {
  if (!isRecord(value) || !isRecord(value.categories)) return null;
  if (typeof value.products !== 'number' || !Number.isInteger(value.products) || value.products < 0 || value.products > LIMITS.products) {
    return null;
  }
  const categories: Record<string, number> = Object.create(null);
  const keys = Object.keys(value.categories);
  if (keys.length > LIMITS.categories) return null;
  for (const key of keys) {
    if (!KEY.test(key)) return null;
    const count = value.categories[key];
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0 || count > LIMITS.products) return null;
    categories[key] = count;
  }
  return { categories, products: value.products };
}

/** French uses labelFr when it is a non-empty string. Otherwise the English label. Null when no label. */
export function productLabel(
  language: StorefrontLanguage,
  product: { label: string | null; labelFr?: string | null },
): string | null {
  if (language === 'fr' && typeof product.labelFr === 'string' && product.labelFr.trim()) return product.labelFr;
  if (typeof product.label === 'string' && product.label.trim()) return product.label;
  return null;
}
