import { validateMobileStorefront } from './contract.ts';
import { acceptSnapshot, readApprovedSnapshot } from './snapshot.ts';
import type { MobileStorefront } from './types.ts';

export const STOREFRONT_CACHE_KEY = 'rappi-storefront-feed';

/**
 * How long a saved feed may be shown while a refresh is in flight, or after a failed refresh.
 * Older copies are ignored so a price or photo change is not hidden by yesterday's file.
 * One minute.
 */
export const STOREFRONT_CACHE_MAX_AGE_MS = 60_000;

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

type SavedFeed = { savedAt?: unknown; feed?: unknown };

/** A bare feed with no savedAt is a long-lived copy. It is not shown. */
export async function readFreshStorefront(store: StorefrontStore, now = Date.now()): Promise<MobileStorefront | null> {
  try {
    const raw = await store.read();
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedFeed;
    if (!saved || typeof saved !== 'object' || typeof saved.savedAt !== 'number' || !Number.isFinite(saved.savedAt)) return null;
    if (now - saved.savedAt > STOREFRONT_CACHE_MAX_AGE_MS || saved.savedAt > now + 60_000) return null;
    const parsed = validateMobileStorefront(saved.feed);
    return parsed.ok ? parsed.value : null;
  } catch {
    return null;
  }
}

async function writeFresh(store: StorefrontStore, feed: MobileStorefront, now: number): Promise<void> {
  try {
    await store.write(JSON.stringify({ savedAt: now, feed }));
  } catch {
    // A failed write still returns the fresh feed. The next open fetches again.
  }
}

export async function resolveStorefront(options: {
  production: boolean;
  apiUrl: string | undefined;
  store: StorefrontStore;
  fetchFeed: () => Promise<unknown>;
  /** Last resort when the network fails and there is no fresh cached feed. */
  readSnapshot?: () => Promise<unknown | null>;
  /** Clock for tests. Defaults to Date.now. */
  now?: number;
}): Promise<MobileStorefront | null> {
  const now = options.now ?? Date.now();
  const cached = await readFreshStorefront(options.store, now);
  if (!storeHostAllowed(options.apiUrl, options.production)) return cached;
  try {
    const body = await options.fetchFeed();
    const parsed = validateMobileStorefront(body);
    if (!parsed.ok) return cached;
    await writeFresh(options.store, parsed.value, now);
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

/** Foreground and a fresh app open both report active. */
export function storefrontRefreshOnState(state: string): boolean {
  return state === 'active';
}
