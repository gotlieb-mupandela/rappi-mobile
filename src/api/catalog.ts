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

/**
 * Website folders are already curated per audience (Woman → Lifestyle) and few products carry an audience tag,
 * so inside a folder the audience only narrows it when that leaves something. Subcategories stay strict.
 */
export async function fetchFolderCatalog(params: CatalogQuery): Promise<CatalogPage> {
  const page = await fetchCatalog(params);
  if (!params.audience || !params.group || page.total > 0) return page;
  const { audience: _audience, ...rest } = params;
  return fetchCatalog(rest);
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
/** Folder keys that stand for a text search inside the category, e.g. the website's "Polyester" team tile. */
const SEARCH_PREFIX = 'q:';
/** Folder key for the whole category: its root folders, or every product when opened as a leaf. */
export const ALL_FOLDER = 'all';

export function isSubFolder(key: string): boolean {
  return key.startsWith(SUB_PREFIX);
}

export function isSearchFolder(key: string): boolean {
  return key.startsWith(SEARCH_PREFIX);
}

/** `sub:<slug>` for a whole subcategory, `sub:<slug>@<group>` for a subcategory inside a group (Jackets → Hoodies). */
export function subFolderKey(sub: string, group?: string): string {
  return group ? `${SUB_PREFIX}${sub}@${group}` : `${SUB_PREFIX}${sub}`;
}

export function searchFolderKey(q: string): string {
  return `${SEARCH_PREFIX}${q}`;
}

export function folderProductQuery(
  cat: string,
  key?: string,
  audience?: string,
): Pick<CatalogQuery, 'cat' | 'group' | 'sub' | 'q' | 'audience'> {
  const base = audience ? { cat, audience } : { cat };
  if (!key || key === ALL_FOLDER) return base;
  if (isSubFolder(key)) {
    const [sub, group] = key.slice(SUB_PREFIX.length).split('@');
    return group ? { ...base, sub, group } : { ...base, sub };
  }
  if (isSearchFolder(key)) return { ...base, q: key.slice(SEARCH_PREFIX.length) };
  return { ...base, group: key };
}

/** Catalog folders for a category. Names come from the catalog response. */
export async function fetchHubTypes(cat: string): Promise<Folder[]> {
  const folders = await fetchFolders(cat);
  return folders.filter((folder) => folder.key !== 'general');
}

/** Folders shown inside a folder. Names and children come from the catalog response. */
export async function fetchSiteFolders(cat: string, key?: string, _audience?: string): Promise<Folder[]> {
  if (!key || key === ALL_FOLDER) return fetchHubTypes(cat);
  return fetchFolders(cat, key);
}

export async function fetchFolders(cat: string, group?: string): Promise<Folder[]> {
  if (group === ALL_FOLDER) group = undefined;
  if (group && (isSubFolder(group) || isSearchFolder(group))) return [];
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
      .map((sub) => ({ key: subFolderKey(sub.slug), name: sub.name, count: sub.count, hasChildren: false }));
  }
}
