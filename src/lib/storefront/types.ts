/** Wire shape agreed for the mobile storefront feed. Routes are not part of the payload. */

export type LocalizedText = {
  en: string;
  fr: string;
};

export type StorefrontNode = {
  key: string;
  parent: string | null;
  order: number;
  target: string;
  image: string | null;
  title: LocalizedText;
  description: LocalizedText;
  hidden: boolean;
};

export type StorefrontShipping = {
  key: string;
  title: LocalizedText;
  amountNad: number;
};

export type StorefrontCheckout = {
  shipping: StorefrontShipping[];
  vatCountries: string[];
  vatRate: number;
  eurPerNad: number;
};

export type StorefrontProduct = {
  code: string;
  label: string | null;
  /** Optional French label. Null when `label` is null. Omitted by older feeds. */
  labelFr?: string | null;
  isPack: boolean;
  pairCount: number | null;
  cardImage: string | null;
  images: string[];
  line: string | null;
  category: string | null;
  subcategory: string | null;
  audience: string | null;
};

export type MobileStorefront = {
  version: string;
  menus: StorefrontNode[];
  homeTiles: StorefrontNode[];
  categories: StorefrontNode[];
  checkout: StorefrontCheckout;
  products: StorefrontProduct[];
};

export type StorefrontLanguage = 'en' | 'fr';
