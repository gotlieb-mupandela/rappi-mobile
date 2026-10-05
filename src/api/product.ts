import { ApiError, apiFetch, isRouteMissing } from '@/src/api/client';
import { fetchCatalog, visibleProduct } from '@/src/api/catalog';
import type { Product } from '@/src/api/types';

const GONE = 'This product is no longer available.';

export async function fetchProduct(code: string): Promise<Product> {
  try {
    const product = await apiFetch<Product>(`/api/products/${encodeURIComponent(code)}`, { fallbackMessage: GONE });
    if (!visibleProduct(product)) throw new ApiError(GONE, 404);
    return product;
  } catch (error) {
    if (!isRouteMissing(error)) throw error;
    // Exact-code lookup through the catalog while /api/products/{code} is not deployed.
    let pageNumber = 1;
    while (true) {
      const page = await fetchCatalog({ q: code, page: pageNumber, pageSize: 24 });
      const match = page.products.find((product) => product.code === code);
      if (match) return match;
      if (pageNumber >= page.pageCount) break;
      pageNumber += 1;
    }
    throw new ApiError(GONE, 404);
  }
}
