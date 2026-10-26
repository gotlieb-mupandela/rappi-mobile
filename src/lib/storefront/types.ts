/**
 * Wire shape of MobileStorefront.
 * The document includes span, tone, slug, and audiences from the web feed revision recorded in data/web-pin.json.
 * Routes are not part of the payload.
 */

export type LocalizedText = {
  en: string;
  fr: string;
};

export type StorefrontNodeKind = 'menu' | 'folder' | 'category' | 'audience' | 'tile';

/** One audience row on a category node. target is an exact fixed path. */
export type StorefrontAudienceRef = {
  id: string;
  label: LocalizedText;
  count: number;
  target: string;
};

export type StorefrontNode = {
  key: string;
  kind: StorefrontNodeKind;
  parent: string | null;
  order: number;
  target: string;
  image: string | null;
  title: LocalizedText;
  description: LocalizedText;
  hidden: boolean;
  count: number;
  group: string | null;
  tiles: string[];
  /** Home tiles only. 1 or 2, or null when this node is not a home tile. */
  span: 1 | 2 | null;
  /** Home tiles only. dark or light, or null when this node is not a home tile. */
  tone: 'dark' | 'light' | null;
  /** Audience nodes only. men, women, or kids. Null on every other kind. */
  slug: string | null;
  /** Per-hub audiences from the feed. Empty when the category has one or none. */
  audiences: StorefrontAudienceRef[];
};

export type StorefrontShipping = {
  key: string;
  title: LocalizedText;
  amountNad: number;
};

export type StorefrontCountry = {
  code: string;
  name: string;
  /** Fraction from 0 to 1. 0.15 is 15 percent. */
  vatRate: number;
};

export type StorefrontCheckout = {
  shipping: StorefrontShipping[];
  countries: StorefrontCountry[];
  /** Euros for 1 Namibian dollar. Display only. */
  eurPerNad: number;
};

export type StorefrontProduct = {
  code: string;
  label: string | null;
  /** French card badge. Null when `label` is null. Omitted feeds fall back to `label`. */
  labelFr?: string | null;
  isPack: boolean;
  pairCount: number | null;
  cardImage: string | null;
  images: string[];
  /** Supplier line. The feed field `item` is never read. */
  line: string | null;
  category: string | null;
  subcategory: string | null;
  audience: string | null;
};

export type StorefrontCounts = {
  categories: Record<string, number>;
  products: number;
};

export type MobileStorefront = {
  version: string;
  nodes: StorefrontNode[];
  /** Header menu keys in site order. */
  menus: string[];
  categoryOrder: string[];
  products: StorefrontProduct[];
  checkout: StorefrontCheckout;
  counts: StorefrontCounts;
};

export type StorefrontLanguage = 'en' | 'fr';

/** App screen for one allowlisted target path. Fields are app ids, never a feed URL. */
export type StorefrontRoute =
  | { screen: 'home' }
  | { screen: 'menu'; menu: string; path: string[] }
  | { screen: 'category'; slug: string }
  | { screen: 'group'; cat: string; group: string; audience?: string; leaf: boolean };
