/**
 * Feed contract: runtime validator and the fixed target-key table.
 * Edit this file when the web feed's final field names or target keys land.
 *
 * Route path read from rappi-webapp `feat/mobile-feed-1` at d7366760dac9feeb167598e2d8730c02ee6ae084.
 * That commit still serves a different payload (href, no fr). The path is unconfirmed
 * for the agreed MobileStorefront shape. The older image-map type is GET /api/mobile/storefront.
 */
import { sanitizeImageUrl } from './images.ts';
import type {
  LocalizedText,
  MobileStorefront,
  StorefrontCheckout,
  StorefrontCountry,
  StorefrontLanguage,
  StorefrontNode,
  StorefrontProduct,
  StorefrontShipping,
} from './types.ts';

export const STOREFRONT_PATH = '/api/mobile/v1/storefront';

export const STORE_HOST = 'www.rappisportshub.com';

export type StorefrontRoute =
  | { screen: 'menu'; menu: string; path: string[] }
  | { screen: 'category'; slug: string }
  | { screen: 'group'; cat: string; group: string; audience?: string; leaf: boolean }
  | { screen: 'kids' };

const KEY = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}$/;
const CODE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,64}$/;
const COUNTRY = /^[A-Z]{2}$/;

function menu(menuKey: string, path: string[] = []): StorefrontRoute {
  return { screen: 'menu', menu: menuKey, path };
}

function category(slug: string): StorefrontRoute {
  return { screen: 'category', slug };
}

function group(cat: string, folder: string, audience?: string): StorefrontRoute {
  return { screen: 'group', cat, group: folder, audience, leaf: true };
}

/**
 * Exact target keys taken from the tile and menu ids on web branch feat/mobile-feed-1.
 * Values are app screens, never the href strings from that branch.
 */
export const TARGET_ALIASES: Readonly<Record<string, StorefrontRoute>> = {
  teamwear: menu('teamwear'),
  sportswear: category('sportswear'),
  running: category('running-fitness'),
  lifestyle: category('lifestyle'),
  footwear: category('shoes'),
  kids: menu('kids'),
  men: menu('men'),
  women: menu('women'),
  shoes: menu('shoes'),
  kits: menu('kits'),
  accessories: menu('accessories'),
  outlet: menu('outlet'),

  'men-teamwear': group('sportswear', 'teamwear', 'men'),
  'men-teamwear-pro': group('sportswear', 'teamwear-pro-2026', 'men'),
  'men-running': group('sportswear', 'running-trail', 'men'),
  'men-cycling': group('sportswear', 'cycling', 'men'),
  'men-racket': group('sportswear', 'racket-sports', 'men'),
  'men-hiking': group('sportswear', 'hiking-outdoor', 'men'),
  'men-fitness': group('sportswear', 'fitness-gym', 'men'),
  'men-lifestyle': group('sportswear', 'lifestyle-apparel', 'men'),
  'men-resort': group('sportswear', 'resort', 'men'),
  'men-aguila': group('sportswear', 'aguila-line', 'men'),
  'men-beachwear': group('sportswear', 'beachwear', 'men'),
  'men-brama': group('sportswear', 'underwear-brama', 'men'),
  'men-combat': group('sportswear', 'athletes-combat', 'men'),
  'men-elite': group('sportswear', 'elite-club', 'men'),

  'women-teamwear': group('sportswear', 'teamwear-woman', 'women'),
  'women-teamwear-pro': group('sportswear', 'w-teamwear-pro-2026', 'women'),
  'women-running': group('sportswear', 'running-trail-woman', 'women'),
  'women-cycling': group('sportswear', 'w-cycling', 'women'),
  'women-racket': group('sportswear', 'racket-sports-woman', 'women'),
  'women-hiking': group('sportswear', 'w-hiking-outdoor', 'women'),
  'women-fitness': group('sportswear', 'fitness-gym-woman', 'women'),
  'women-lifestyle': group('sportswear', 'lifestyle-apparel-woman', 'women'),
  'women-resort': group('sportswear', 'w-resort', 'women'),
  'women-aguila': group('sportswear', 'w-aguila-line', 'women'),
  'women-beachwear': group('sportswear', 'w-beachwear', 'women'),
  'women-brama': group('sportswear', 'underwear-brama-woman', 'women'),
  'women-combat': group('sportswear', 'w-athletes-combat', 'women'),
  'women-elite': group('sportswear', 'w-elite-club', 'women'),

  'kids-1-4': group('sportswear', 'kids-1-4', 'kids'),
  'kids-6-10': group('sportswear', 'kids-6-10', 'kids'),
  'kids-12-14-boy': group('sportswear', 'kids-12-14-boy', 'kids'),
  'kids-12-14-girl': group('sportswear', 'kids-12-14-girl', 'kids'),

  'shoes-men': group('shoes', 'all', 'men'),
  'shoes-women': group('shoes', 'all', 'women'),
  'shoes-kids': group('shoes', 'all', 'kids'),
  'shoes-outlet': group('shoes', 'footwear-outlet'),
  flow: group('shoes', 'flow'),

  'acc-balls': group('balls-bags', 'acc-balls'),
  'acc-backpacks': group('balls-bags', 'acc-backpacks'),
  'acc-socks': group('sportswear', 'acc-socks'),

  'kits-federations': group('sportswear', 'kits-federations'),
  'kits-special': group('sportswear', 'kits-special'),

  'outlet-promotions': group('sportswear', 'outlet-promotions'),
  'outlet-footwear': group('shoes', 'outlet-footwear'),
  'outlet-apparel-byear': group('sportswear', 'outlet-apparel-byear'),
  'outlet-sweatshirt-jacket': group('sportswear', 'outlet-sweatshirt-jacket'),
  'outlet-tshirt-top': group('sportswear', 'outlet-tshirt-top'),
  'outlet-pants-shorts': group('sportswear', 'outlet-pants-shorts'),
  'outlet-anorak': group('sportswear', 'outlet-anorak'),
  'outlet-tracksuit': group('sportswear', 'outlet-tracksuit'),
  'outlet-junior': group('sportswear', 'outlet-junior'),
  'outlet-price-199-299': group('sportswear', 'outlet-price-199-299'),
  'outlet-price-299-399': group('sportswear', 'outlet-price-299-399'),
  'outlet-price-399-499': group('sportswear', 'outlet-price-399-499'),
  'outlet-price-499-599': group('sportswear', 'outlet-price-499-599'),
  'outlet-price-599-699': group('sportswear', 'outlet-price-599-699'),
  'outlet-price-699-799': group('sportswear', 'outlet-price-699-799'),
  'outlet-price-799-1099': group('sportswear', 'outlet-price-799-1099'),
  'outlet-price-1099-1599': group('sportswear', 'outlet-price-1099-1599'),
  'outlet-price-from-1599': group('sportswear', 'outlet-price-from-1599'),
};

export const TARGET_ALIAS_KEYS: readonly string[] = Object.keys(TARGET_ALIASES);

/** Own keys only. A feed string is never used to build a route. */
const TARGET_BY_KEY = new Map<string, StorefrontRoute>(Object.entries(TARGET_ALIASES));

/** Unknown keys, including old menu:, category:, and group: shapes, hide the tile. */
export function resolveTarget(key: string): StorefrontRoute | null {
  if (typeof key !== 'string') return null;
  return TARGET_BY_KEY.get(key) ?? null;
}

export type StorefrontValidation =
  | { ok: true; value: MobileStorefront }
  | { ok: false; reason: string };

const LIMITS = {
  menus: 2000,
  homeTiles: 200,
  categories: 500,
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

function readNode(value: unknown): StorefrontNode | null {
  if (!isRecord(value)) return null;
  if (typeof value.key !== 'string' || !KEY.test(value.key)) return null;
  if (value.parent !== null && (typeof value.parent !== 'string' || !KEY.test(value.parent))) return null;
  if (typeof value.order !== 'number' || !Number.isInteger(value.order) || value.order < -1_000_000 || value.order > 1_000_000) {
    return null;
  }
  if (typeof value.target !== 'string' || value.target.length === 0 || value.target.length > 180) return null;
  if (typeof value.hidden !== 'boolean') return null;
  const title = readCopy(value.title, LIMITS.title, true);
  const description = readCopy(value.description, LIMITS.description, false);
  if (!title || !description) return null;
  if (value.image !== null && value.image !== undefined && typeof value.image !== 'string') return null;
  return {
    key: value.key,
    parent: value.parent,
    order: value.order,
    target: value.target,
    image: sanitizeImageUrl(value.image),
    title,
    description,
    hidden: value.hidden,
  };
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
  if (value.line !== null && (typeof value.line !== 'string' || !isPlainText(value.line, LIMITS.line))) return null;
  const category = readOptionalMeta(value.category);
  const subcategory = readOptionalMeta(value.subcategory);
  const audience = readOptionalMeta(value.audience);
  if (!category || !subcategory || !audience) return null;
  const images: string[] = [];
  for (const image of value.images) {
    if (images.length >= LIMITS.images) break;
    const clean = sanitizeImageUrl(image);
    if (clean) images.push(clean);
  }
  return {
    code: value.code,
    label,
    labelFr,
    isPack: value.isPack,
    pairCount: value.pairCount,
    cardImage: sanitizeImageUrl(value.cardImage),
    images,
    line: value.line,
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
  const menus = readNodes(value.menus, LIMITS.menus);
  const homeTiles = readNodes(value.homeTiles, LIMITS.homeTiles);
  const categories = readNodes(value.categories, LIMITS.categories);
  if (!menus || !homeTiles || !categories) return { ok: false, reason: 'Feed navigation is malformed.' };
  const checkout = readCheckout(value.checkout);
  if (!checkout) return { ok: false, reason: 'Feed checkout display is malformed.' };
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
  return { ok: true, value: { version: value.version, menus, homeTiles, categories, checkout, products } };
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
