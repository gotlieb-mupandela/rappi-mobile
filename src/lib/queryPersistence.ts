import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import type { AsyncStorage, PersistedClient, Persister } from '@tanstack/query-persist-client-core';

/** Public catalog screens. Orders, profile, stock and anything else stay in memory. */
export const PUBLIC_QUERY_ROOTS = [
  'catalog',
  'catalog-nav',
  'product',
  'folder-products',
  'site-folders',
  'folder-cover',
  'hub-overview',
  'hub-types',
  'hub-athlete',
] as const;

const PUBLIC_QUERY_ROOT_SET = new Set<string>(PUBLIC_QUERY_ROOTS);

export const QUERY_CACHE_KEY = 'rappi-query-cache';

export function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  return typeof root === 'string' && PUBLIC_QUERY_ROOT_SET.has(root);
}

/** Drops account queries and paused mutations before they are written or restored. */
export function persistedClientWithoutPersonalData(client: PersistedClient): PersistedClient {
  return {
    ...client,
    clientState: {
      mutations: [],
      queries: client.clientState.queries.filter((query) => shouldPersistQuery(query.queryKey)),
    },
  };
}

/** Changing this drops caches written before personal data was stripped on restore. */
export function catalogCacheBuster(version: string): string {
  return `${version}:public-catalog`;
}

export function createPublicCatalogPersister(storage: AsyncStorage<string>, throttleTime = 2_000): Persister {
  const base = createAsyncStoragePersister({
    storage,
    key: QUERY_CACHE_KEY,
    throttleTime,
  });
  return {
    persistClient: (client) => base.persistClient(persistedClientWithoutPersonalData(client)),
    restoreClient: async () => {
      const restored = await base.restoreClient();
      if (!restored) return restored;
      return persistedClientWithoutPersonalData(restored);
    },
    removeClient: () => base.removeClient(),
  };
}
