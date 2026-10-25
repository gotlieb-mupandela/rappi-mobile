/** AsyncStorage keys that hold a signed-in shopper's local copy of account data. */
export const BAG_STORAGE_KEY = 'bag';
export const WISHLIST_STORAGE_KEY = 'wishlist';
export const PENDING_PAYMENT_STORAGE_KEY = 'pendingPayment';

export const SIGNED_OUT_STORAGE_KEYS = [BAG_STORAGE_KEY, WISHLIST_STORAGE_KEY, PENDING_PAYMENT_STORAGE_KEY] as const;

type ClearLocalSessionDeps = {
  clearQueries: () => void;
  removePersistedQueries: () => unknown;
  removeItems: (keys: readonly string[]) => Promise<void>;
};

/** Drops the in-memory query cache, its disk copy, and the shopping keys above. */
export async function clearLocalSession(deps: ClearLocalSessionDeps): Promise<void> {
  deps.clearQueries();
  await deps.removePersistedQueries();
  await deps.removeItems(SIGNED_OUT_STORAGE_KEYS);
}
