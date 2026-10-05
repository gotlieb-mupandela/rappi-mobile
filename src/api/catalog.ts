import { apiFetch, isRouteMissing } from '@/src/api/client';
import type { CatalogPage, CatalogQuery, Folder, FoldersResponse, NavResponse, Product } from '@/src/api/types';

export function visibleProduct(product: Product): boolean {
  return product.available !== false && product.code !== 'DPO-TEST';
}

export function sizeFacets(sizes: CatalogPage['facets']['sizes']): { slug: string; name: string }[] {
  return (sizes ?? []).map((item) =>
    typeof item === 'string' ? { slug: item, name: item } : { slug: item.slug, name: item.name },
  );
}

function queryString(params: CatalogQuery): string {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.cat) search.set('cat', params.cat);
  if (params.sub) search.set('sub', params.sub);
  if (params.group) search.set('group', params.group);
  if (params.size) search.set('size', params.size);
  if (params.audience) search.set('audience', params.audience);
  if (params.max != null) search.set('max', String(params.max));
  search.set('page', String(params.page ?? 1));
  search.set('pageSize', String(params.pageSize ?? 24));
  return search.toString();
}

export async function fetchCatalog(params: CatalogQuery): Promise<CatalogPage> {
  const page = await apiFetch<CatalogPage>(`/api/catalog?${queryString(params)}`);
  return {
    ...page,
    products: (page.products ?? []).filter(visibleProduct),
  };
}

export async function fetchNav(): Promise<NavResponse> {
  try {
    return await apiFetch<NavResponse>('/api/catalog/nav');
  } catch (error) {
    if (!isRouteMissing(error)) throw error;
    // Same counts from the catalog facets while /api/catalog/nav is not deployed.
    const page = await fetchCatalog({ pageSize: 1 });
    const categoryCounts: Record<string, number> = {};
    for (const facet of page.facets?.categories ?? []) categoryCounts[facet.slug] = facet.count;
    return { taxonomy: {}, categoryCounts };
  }
}

/** Folder keys built from catalog `sub` facets while /api/catalog/folders is not deployed. */
const SUB_PREFIX = 'sub:';

export function isSubFolder(key: string): boolean {
  return key.startsWith(SUB_PREFIX);
}

export function folderProductQuery(cat: string, key?: string): Pick<CatalogQuery, 'cat' | 'group' | 'sub'> {
  if (!key) return { cat };
  if (isSubFolder(key)) return { cat, sub: key.slice(SUB_PREFIX.length) };
  return { cat, group: key };
}

export async function fetchFolders(cat: string, group?: string): Promise<Folder[]> {
  if (group && isSubFolder(group)) return [];
  const search = new URLSearchParams({ cat });
  if (group) search.set('group', group);
  try {
    const data = await apiFetch<FoldersResponse>(`/api/catalog/folders?${search.toString()}`);
    return (data.folders ?? []).filter((folder) => folder.count > 0);
  } catch (error) {
    if (!isRouteMissing(error)) throw error;
    if (group) return [];
    const page = await fetchCatalog({ cat, pageSize: 1 });
    return (page.facets?.subs ?? [])
      .filter((sub) => sub.count > 0)
      .map((sub) => ({ key: `${SUB_PREFIX}${sub.slug}`, name: sub.name, count: sub.count, hasChildren: false }));
  }
}
