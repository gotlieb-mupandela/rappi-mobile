import type { Product, ProductSize, StockResponse } from '@/src/api/types';
import { colors } from '@/src/theme';

export function productSizes(product: Product, stock?: StockResponse): ProductSize[] {
  const live = stock?.stock?.[product.code]?.sizes;
  if (live && live.length > 0) return live;
  if (product.sizes?.length > 0) return product.sizes;
  if (product.sizeOptions?.length === 1) return [{ size: product.sizeOptions[0], stock: product.stockQty }];
  return [];
}

/** A lone "ONE"/"SKU" size is preselected and the picker hidden. */
export function isOneSize(sizes: ProductSize[]): boolean {
  return sizes.length === 1 && /^(ONE|SKU|ONE SIZE|OS)$/i.test(sizes[0].size.trim());
}

export function defaultSize(sizes: ProductSize[]): string | undefined {
  return sizes.length === 1 ? sizes[0].size : undefined;
}

export function isAvailable(product: Product, stock?: StockResponse): boolean {
  if (product.available === false || product.code === 'DPO-TEST') return false;
  return stock?.stock?.[product.code]?.available !== false;
}

export function isSoldOut(sizes: ProductSize[]): boolean {
  return sizes.length === 0 || sizes.every((item) => item.stock <= 0);
}

export function stockLine(count: number): { text: string; color: string } {
  if (count <= 0) return { text: 'Sold out', color: colors.danger };
  if (count <= 5) return { text: `Only ${count} left`, color: colors.warn };
  return { text: `${count} in stock`, color: colors.muted };
}

export function isPack(product: Product): boolean {
  return product.sellAs === 'pack' || product.sellAs === 'assortment' || product.sellAs === 'multipack';
}
