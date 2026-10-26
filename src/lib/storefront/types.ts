/** Wire shape of MobileStorefront from rappi-webapp PR 98 at ac533ee. Routes are not part of the payload. */

export type LocalizedText = {
  en: string;
  fr: string;
};

export type StorefrontNodeKind = 'menu' | 'folder' | 'category' | 'audience' | 'tile';

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
  /** Plain pack badge from the feed. Null when the feed omits it. */
  packLabel: string | null;
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
