import { validateMobileStorefront } from './contract.ts';
import { acceptSnapshot, readApprovedSnapshot } from './snapshot.ts';
import type { MobileStorefront } from './types.ts';

export const STOREFRONT_CACHE_KEY = 'rappi-storefront-feed';

export type StorefrontStore = {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
};

export function memoryStore(initial: string | null = null): StorefrontStore {
  let value = initial;
  return {
    read: async () => value,
    write: async (next) => {
      value = next;
    },
  };
}

type KeyValue = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

/** Swappable persistence. The app passes AsyncStorage. Tests pass an in-memory store. */
export function keyValueStore(storage: KeyValue, key = STOREFRONT_CACHE_KEY): StorefrontStore {
  return {
    read: () => storage.getItem(key),
    write: (value) => storage.setItem(key, value),
  };
}

export function storeHostAllowed(apiUrl: string | undefined, production: boolean): boolean {
  if (!apiUrl) return false;
  try {
    const url = new URL(apiUrl);
    if (url.protocol !== 'https:') return false;
    if (production && url.hostname !== 'www.rappisportshub.com') return false;
    return true;
  } catch {
    return false;
  }
}

async function readCached(store: StorefrontStore): Promise<MobileStorefront | null> {
  try {
    const raw = await store.read();
    if (!raw) return null;
    const parsed = validateMobileStorefront(JSON.parse(raw));
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}

export async function resolveStorefront(options: {
  enabled: boolean;
  production: boolean;
  apiUrl: string | undefined;
  store: StorefrontStore;
  fetchFeed: () => Promise<unknown>;
  /** Last resort when the network fails and there is no cached feed. */
  readSnapshot?: () => Promise<unknown | null>;
}): Promise<MobileStorefront | null> {
  if (!options.enabled) return null;
  const cached = await readCached(options.store);
  if (!storeHostAllowed(options.apiUrl, options.production)) return cached;
  try {
    const body = await options.fetchFeed();
    const parsed = validateMobileStorefront(body);
    if (!parsed.ok) return cached;
    try {
      await options.store.write(JSON.stringify(parsed.value));
    } catch {
      // A failed write still returns the fresh feed. The next launch can fetch again.
    }
    return parsed.value;
  } catch {
    if (cached) return cached;
    try {
      const read = options.readSnapshot ?? readApprovedSnapshot;
      return acceptSnapshot(await read());
    } catch {
      return null;
    }
  }
}
