export type Gender = 'men' | 'women' | 'kids' | 'unisex';

export type ProductSize = {
  size: string;
  stock: number;
};

export type Product = {
  id: string;
  code: string;
  item: string;
  title: string;
  name: string;
  displayName: string;
  category: string;
  hubs?: string[];
  subcategory: string;
  gender: Gender;
  price: number;
  unitPrice: number;
  currency: 'NAD';
  stockQty: number;
  badge: 'new' | 'offer' | null;
  sizeOptions: string[];
  sizes: ProductSize[];
  imageUrl: string;
  images: string[];
  description?: string;
  available?: boolean;
  sellAs?: 'pack' | 'assortment' | 'multipack';
  packSize?: number | null;
};

export type Facet = {
  slug: string;
  name: string;
  count: number;
};

export type CatalogFacets = {
  categories: Facet[];
  audiences: Facet[];
  subs: Facet[];
  sizes: Array<Facet | string>;
};

export type CatalogPage = {
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  facets: CatalogFacets;
  products: Product[];
};

export type CatalogQuery = {
  q?: string;
  cat?: string;
  sub?: string;
  group?: string;
  size?: string;
  audience?: string;
  max?: number;
  page?: number;
  pageSize?: number;
};

export type NavResponse = {
  taxonomy: Record<string, Facet[]>;
  categoryCounts: Record<string, number>;
};

export type Folder = {
  key: string;
  name: string;
  count: number;
  hasChildren: boolean;
  imageUrl?: string;
};

export type FoldersResponse = {
  folders: Folder[];
};

export type StockEntry = {
  available: boolean;
  sizes: ProductSize[];
};

export type StockResponse = {
  stock: Record<string, StockEntry>;
};

export type CheckoutLine = {
  code: string;
  size: string;
  qty: number;
};

export type ShippingMethod = 'standard' | 'express' | 'pickup';

export type CreatePaymentBody = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: 'Namibia';
  notes: string;
  shippingMethod: ShippingMethod;
  lines: CheckoutLine[];
};

export type CreatePaymentSuccess = {
  paymentUrl: string;
  companyRef: string;
  transToken: string;
};

export type ApiErrorBody = {
  error?: string;
};

export type QuoteBody = {
  name: string;
  email: string;
  organisation: string;
  sport: string;
  players: string;
  sizes: string;
  notes: string;
};
