import { apiFetch } from '@/src/api/client';
import type { ProductSize, StockResponse } from '@/src/api/types';

export async function fetchStock(codes: string[]): Promise<StockResponse> {
  const unique = codes.filter(Boolean).slice(0, 50);
  if (unique.length === 0) return { stock: {} };
  return apiFetch<StockResponse>(`/api/stock?codes=${unique.map(encodeURIComponent).join(',')}`, {
    fallbackMessage: 'Stock is unavailable.',
    cache: 'no-store',
  });
}

export function sizesFromStock(code: string, stock: StockResponse | undefined, fallback: ProductSize[]): ProductSize[] {
  return stock?.stock?.[code]?.sizes ?? fallback;
}
