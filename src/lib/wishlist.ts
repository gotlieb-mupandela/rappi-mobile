import { router } from 'expo-router';
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/src/lib/auth';
import { createQueuedJsonWriter, readStoredJson } from '@/src/lib/deviceStorage';
import { successHaptic, tapHaptic } from '@/src/lib/haptics';
import { supabase } from '@/src/lib/supabase';
import { useToast } from '@/src/lib/toast';
import {
  addEntry,
  adoptGuestList,
  attachIds,
  EMPTY_WISHLIST,
  mergeRemote,
  newestFirst,
  parseStoredWishlist,
  removeEntry,
  settlePending,
  WISHLIST_LIMIT,
  type RemoteWishlistRow,
  type WishlistEntry,
  type WishlistState,
} from '@/src/lib/wishlistRules';

export type { WishlistEntry } from '@/src/lib/wishlistRules';

const KEY = 'wishlist';
const writeWishlist = createQueuedJsonWriter(KEY);
const FOREIGN_KEY_VIOLATION = '23503';

type SaveTarget = { code: string; id?: string };

async function pullRemote(userId: string): Promise<RemoteWishlistRow[]> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('product_id, created_at, products(code)')
    .eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).flatMap((row: { product_id: string; created_at: string; products: unknown }) => {
    const product = (Array.isArray(row.products) ? row.products[0] : row.products) as { code?: string } | null;
    return product?.code ? [{ id: row.product_id, code: product.code, addedAt: Date.parse(row.created_at) || 0 }] : [];
  });
}

async function resolveIds(codes: string[]): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('products').select('id, code').in('code', codes);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row: { id: string; code: string }) => [row.code, row.id]));
}

async function insertItems(userId: string, ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('wishlist_items')
    .upsert(ids.map((id) => ({ user_id: userId, product_id: id })), { onConflict: 'user_id,product_id', ignoreDuplicates: true });
  if (error && error.code !== FOREIGN_KEY_VIOLATION) throw error;
  if (error && ids.length > 1) {
    // One deleted product fails the whole batch; retry singly so the rest still land.
    for (const id of ids) await insertItems(userId, [id]);
  }
}

async function pushPending(userId: string, state: WishlistState): Promise<{ added: string[]; removed: string[] }> {
  const removed = [...state.pendingRemove];
  const added = [...state.pendingAdd];
  if (removed.length) {
    const { error } = await supabase.from('wishlist_items').delete().eq('user_id', userId).in('product_id', removed);
    if (error) throw error;
  }
  if (added.length) await insertItems(userId, added);
  return { added, removed };
}

type WishlistContextValue = {
  /** Newest first. */
  entries: WishlistEntry[];
  count: number;
  ready: boolean;
  /** True when the list is saved to the signed-in account. */
  synced: boolean;
  has: (code: string) => boolean;
  add: (target: SaveTarget) => 'added' | 'exists' | 'full';
  remove: (code: string) => WishlistEntry | undefined;
  restore: (entry: WishlistEntry) => void;
  setSize: (code: string, size: string) => void;
  learnIds: (idsByCode: Record<string, string>) => void;
  refresh: () => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<WishlistState>(EMPTY_WISHLIST);
  const [loaded, setLoaded] = useState(false);
  const stateRef = useRef(state);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const update = useCallback((change: (current: WishlistState) => WishlistState) => {
    const next = change(stateRef.current);
    if (next !== stateRef.current) {
      stateRef.current = next;
      setState(next);
    }
    return next;
  }, []);

  useEffect(() => {
    void readStoredJson<unknown>(KEY, null).then((raw) => {
      update(() => parseStoredWishlist(raw));
      setLoaded(true);
    });
  }, [update]);

  useEffect(() => {
    if (loaded) writeWishlist(state);
  }, [loaded, state]);

  // Remote work runs one task at a time so a pull can never overwrite a change that is still being sent.
  const enqueue = useCallback((task: () => Promise<void>) => {
    queue.current = queue.current.then(task).catch(() => undefined);
    return queue.current;
  }, []);

  const flush = useCallback(
    () =>
      enqueue(async () => {
        const owner = stateRef.current.owner;
        if (!owner) return;
        const missing = stateRef.current.entries.filter((entry) => !entry.id).map((entry) => entry.code);
        if (missing.length) {
          const ids = await resolveIds(missing);
          update((current) => (current.owner === owner ? attachIds(current, ids) : current));
        }
        const snapshot = stateRef.current;
        if (snapshot.owner !== owner || (!snapshot.pendingAdd.length && !snapshot.pendingRemove.length)) return;
        const sent = await pushPending(owner, snapshot);
        update((current) => (current.owner === owner ? settlePending(current, sent) : current));
      }),
    [enqueue, update],
  );

  const refresh = useCallback(() => {
    void flush();
    return enqueue(async () => {
      const owner = stateRef.current.owner;
      if (!owner) return;
      const rows = await pullRemote(owner);
      update((current) => (current.owner === owner ? mergeRemote(current, rows) : current));
    });
  }, [enqueue, flush, update]);

  useEffect(() => {
    if (!loaded || !authReady) return;
    const owner = stateRef.current.owner;
    if (userId) {
      if (owner === null) update((current) => adoptGuestList(current, userId));
      else if (owner !== userId) update(() => ({ ...EMPTY_WISHLIST, owner: userId }));
      void refresh();
    } else if (owner) {
      // Signed out: the list lives on in the account, so don't leave it on a possibly shared phone.
      update(() => EMPTY_WISHLIST);
    }
  }, [authReady, loaded, refresh, update, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && stateRef.current.owner) void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const add = useCallback<WishlistContextValue['add']>(
    (target) => {
      const current = stateRef.current;
      if (current.entries.some((entry) => entry.code === target.code)) return 'exists';
      if (current.entries.length >= WISHLIST_LIMIT) return 'full';
      update((latest) => addEntry(latest, { code: target.code, id: target.id || undefined, addedAt: Date.now() }));
      void flush();
      return 'added';
    },
    [flush, update],
  );

  const remove = useCallback<WishlistContextValue['remove']>(
    (code) => {
      const entry = stateRef.current.entries.find((item) => item.code === code);
      if (!entry) return undefined;
      update((latest) => removeEntry(latest, code));
      void flush();
      return entry;
    },
    [flush, update],
  );

  const restore = useCallback<WishlistContextValue['restore']>(
    (entry) => {
      update((latest) => addEntry(latest, entry));
      void flush();
    },
    [flush, update],
  );

  const setSize = useCallback<WishlistContextValue['setSize']>(
    (code, size) => {
      update((latest) =>
        latest.entries.some((entry) => entry.code === code && entry.size !== size)
          ? { ...latest, entries: latest.entries.map((entry) => (entry.code === code ? { ...entry, size } : entry)) }
          : latest,
      );
    },
    [update],
  );

  const learnIds = useCallback<WishlistContextValue['learnIds']>(
    (idsByCode) => {
      const before = stateRef.current;
      if (update((latest) => attachIds(latest, idsByCode)) !== before) void flush();
    },
    [flush, update],
  );

  const value = useMemo<WishlistContextValue>(() => {
    const codes = new Set(state.entries.map((entry) => entry.code));
    return {
      entries: newestFirst(state.entries),
      count: state.entries.length,
      ready: loaded,
      synced: !!state.owner,
      has: (code) => codes.has(code),
      add,
      remove,
      restore,
      setSize,
      learnIds,
      refresh,
    };
  }, [add, learnIds, loaded, refresh, remove, restore, setSize, state]);

  return createElement(WishlistContext.Provider, { value }, children);
}

export function useWishlist(): WishlistContextValue {
  const value = useContext(WishlistContext);
  if (!value) throw new Error('useWishlist must be used inside WishlistProvider');
  return value;
}

/** Save and remove with the haptics and undoable toasts every heart in the app should share. */
export function useWishlistActions() {
  const wishlist = useWishlist();
  const toast = useToast();
  const { add, remove, restore } = wishlist;

  const removeWithUndo = useCallback(
    (code: string) => {
      const removed = remove(code);
      if (!removed) return;
      tapHaptic();
      toast.show('Removed from wishlist', { icon: 'heart-dislike-outline', action: { label: 'Undo', onPress: () => restore(removed) } });
    },
    [remove, restore, toast],
  );

  const toggle = useCallback(
    (target: SaveTarget): boolean => {
      if (wishlist.has(target.code)) {
        removeWithUndo(target.code);
        return false;
      }
      const result = add(target);
      if (result === 'full') {
        tapHaptic();
        toast.show(`Your wishlist is full (${WISHLIST_LIMIT} items). Remove something to save this.`, {
          icon: 'alert-circle-outline',
          action: { label: 'Open', onPress: () => router.push('/wishlist') },
        });
        return false;
      }
      successHaptic();
      toast.show('Saved to wishlist', { icon: 'heart', action: { label: 'View', onPress: () => router.push('/wishlist') } });
      return true;
    },
    [add, removeWithUndo, toast, wishlist],
  );

  return { toggle, removeWithUndo };
}
