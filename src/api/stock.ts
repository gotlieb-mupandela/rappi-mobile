import { apiFetch } from '@/src/api/client';
import type { ProductSize, StockResponse } from '@/src/api/types';
import { isValidProductCode } from '@/src/lib/storefront/contract';

const STOCK_BATCH = 50;

/** Trim, drop blanks and invalid codes, then keep the first copy of each code. */
function stockCodes(codes: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of codes) {
    if (typeof raw !== 'string') continue;
    const code = raw.trim();
    if (!code || seen.has(code) || !isValidProductCode(code)) continue;
    seen.add(code);
    unique.push(code);
  }
  return unique;
}

/** One `code` parameter per product. Each value is encoded once. */
function stockPath(codes: string[]): string {
  const query = codes.map((code) => `code=${encodeURIComponent(code)}`).join('&');
  return `/api/stock?${query}`;
}

export async function fetchStock(codes: string[]): Promise<StockResponse> {
  const unique = stockCodes(codes);
  if (unique.length === 0) return { stock: {} };
  const stock: StockResponse['stock'] = {};
  for (let index = 0; index < unique.length; index += STOCK_BATCH) {
    const batch = unique.slice(index, index + STOCK_BATCH);
    const page = await apiFetch<StockResponse>(stockPath(batch), {
      fallbackMessage: 'Stock is unavailable.',
      cache: 'no-store',
    });
    Object.assign(stock, page.stock ?? {});
  }
  return { stock };
}

export function sizesFromStock(code: string, stock: StockResponse | undefined, fallback: ProductSize[]): ProductSize[] {
  return stock?.stock?.[code]?.sizes ?? fallback;
}
