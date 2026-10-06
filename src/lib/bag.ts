import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/src/lib/auth';
import { linesAfterStockError } from '@/src/lib/bagRules';
import {
  adoptGuestBag,
  attachBagIds,
  clampQty,
  EMPTY_BAG,
  lineKey,
  mergeRemoteBag,
  parseStoredBag,
  settleBag,
  withLines,
  type BagLine,
  type BagState,
  type RemoteBagRow,
  type SentLine,
} from '@/src/lib/bagSyncRules';
import { createQueuedJsonWriter, readStoredJson } from '@/src/lib/deviceStorage';
import { supabase } from '@/src/lib/supabase';

export type { BagLine } from '@/src/lib/bagSyncRules';

const KEY = 'bag';
const writeBag = createQueuedJsonWriter(KEY);
const FOREIGN_KEY_VIOLATION = '23503';

type RemoteProduct = { code?: string; name?: string; display_name?: string | null; image_url?: string | null; price?: number | string | null };

async function pullRemote(userId: string): Promise<RemoteBagRow[]> {
  const { data, error } = await supabase
    .from('cart_items')
    .select('product_id, size, qty, created_at, products(code, name, display_name, image_url, price)')
    .eq('user_id', userId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).flatMap((row: { product_id: string; size: string; qty: number; products: unknown }) => {
    const product = (Array.isArray(row.products) ? row.products[0] : row.products) as RemoteProduct | null;
    if (!product?.code || row.qty <= 0) return [];
    return [
      {
        id: row.product_id,
        code: product.code,
        size: row.size,
        qty: clampQty(row.qty),
        name: product.display_name || product.name || product.code,
        imageUrl: product.image_url ?? '',
        price: Number(product.price) || 0,
      },
    ];
  });
}

async function resolveIds(codes: string[]): Promise<Record<string, string>> {
  const { data, error } = await supabase.from('products').select('id, code').in('code', codes);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row: { id: string; code: string }) => [row.code, row.id]));
}

type CartRow = { user_id: string; product_id: string; size: string; qty: number };

async function upsertRows(rows: CartRow[]): Promise<void> {
  const { error } = await supabase.from('cart_items').upsert(rows, { onConflict: 'user_id,product_id,size' });
  if (error && error.code !== FOREIGN_KEY_VIOLATION) throw error;
  if (error && rows.length > 1) {
    // One deleted product fails the whole batch; retry singly so the rest still land.
    for (const row of rows) await upsertRows([row]);
  }
}

async function pushPending(userId: string, state: BagState): Promise<SentLine[]> {
  const lines = new Map(state.lines.map((line) => [lineKey(line), line]));
  const rows: CartRow[] = [];
  const removed: Array<{ id: string; size: string }> = [];
  const sent: SentLine[] = [];
  for (const item of state.pending) {
    const line = lines.get(lineKey(item));
    if (line) {
      // Without an id the line cannot be stored yet; it stays queued until one is found.
      if (!line.id) continue;
      rows.push({ user_id: userId, product_id: line.id, size: line.size, qty: line.qty });
      sent.push({ code: line.code, size: line.size, qty: line.qty });
    } else {
      // A removed line that never had an id was never stored, so there is nothing to delete.
      if (item.id) removed.push({ id: item.id, size: item.size });
      sent.push({ code: item.code, size: item.size, qty: null });
    }
  }
  for (const item of removed) {
    const { error } = await supabase.from('cart_items').delete().eq('user_id', userId).eq('product_id', item.id).eq('size', item.size);
    if (error) throw error;
  }
  if (rows.length) await upsertRows(rows);
  return sent;
}

type BagContextValue = {
  lines: BagLine[];
  ready: boolean;
  /** True when the bag is saved to the signed-in account. */
  synced: boolean;
  totalQty: number;
  subtotal: number;
  add: (line: Omit<BagLine, 'qty' | 'id'> & { qty?: number; id?: string }) => void;
  setQty: (code: string, size: string, qty: number) => void;
  remove: (code: string, size: string) => void;
  applyStockError: (message: string) => void;
  clear: () => void;
  refresh: () => Promise<void>;
};

const BagContext = createContext<BagContextValue | null>(null);

export function BagProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<BagState>(EMPTY_BAG);
  const [loaded, setLoaded] = useState(false);
  const stateRef = useRef(state);
  const queue = useRef<Promise<void>>(Promise.resolve());

  const update = useCallback((change: (current: BagState) => BagState) => {
    const next = change(stateRef.current);
    if (next !== stateRef.current) {
      stateRef.current = next;
      setState(next);
    }
    return next;
  }, []);

  useEffect(() => {
    void readStoredJson<unknown>(KEY, null).then((raw) => {
      update(() => parseStoredBag(raw));
      setLoaded(true);
    });
  }, [update]);

  useEffect(() => {
    if (loaded) writeBag(state);
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
        // An adopted guest bag must be combined with the account's bag before anything is uploaded.
        if (!owner || stateRef.current.adopting) return;
        const pendingKeys = new Set(stateRef.current.pending.map(lineKey));
        const missing = [...new Set(stateRef.current.lines.filter((line) => !line.id && pendingKeys.has(lineKey(line))).map((line) => line.code))];
        if (missing.length) {
          const ids = await resolveIds(missing);
          update((current) => (current.owner === owner ? attachBagIds(current, ids) : current));
        }
        const snapshot = stateRef.current;
        if (snapshot.owner !== owner || !snapshot.pending.length) return;
        const sent = await pushPending(owner, snapshot);
        update((current) => (current.owner === owner ? settleBag(current, sent) : current));
      }),
    [enqueue, update],
  );

  const refresh = useCallback(async () => {
    await enqueue(async () => {
      const owner = stateRef.current.owner;
      if (!owner) return;
      const rows = await pullRemote(owner);
      update((current) => (current.owner === owner ? mergeRemoteBag(current, rows) : current));
    });
    await flush();
  }, [enqueue, flush, update]);

  useEffect(() => {
    if (!loaded || !authReady) return;
    const owner = stateRef.current.owner;
    if (userId) {
      if (owner === null) update((current) => adoptGuestBag(current, userId));
      else if (owner !== userId) update(() => ({ ...EMPTY_BAG, owner: userId }));
      void refresh();
    } else if (owner) {
      // Signed out: the bag lives on in the account, so don't leave it on a possibly shared phone.
      update(() => EMPTY_BAG);
    }
  }, [authReady, loaded, refresh, update, userId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active' && stateRef.current.owner) void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const changeLines = useCallback(
    (change: (lines: BagLine[]) => BagLine[]) => {
      const before = stateRef.current;
      if (update((current) => withLines(current, change(current.lines))) !== before) void flush();
    },
    [flush, update],
  );

  const add = useCallback<BagContextValue['add']>(
    (line) => {
      const qty = clampQty(line.qty ?? 1);
      changeLines((prev) => {
        const index = prev.findIndex((item) => item.code === line.code && item.size === line.size);
        if (index < 0) return [...prev, { ...line, id: line.id || undefined, qty }];
        const next = [...prev];
        next[index] = { ...next[index], ...line, id: line.id || next[index].id, qty: clampQty(next[index].qty + qty) };
        return next;
      });
    },
    [changeLines],
  );

  const setQty = useCallback<BagContextValue['setQty']>(
    (code, size, qty) => {
      changeLines((prev) => prev.map((item) => (item.code === code && item.size === size ? { ...item, qty: clampQty(qty) } : item)));
    },
    [changeLines],
  );

  const remove = useCallback<BagContextValue['remove']>(
    (code, size) => {
      changeLines((prev) => prev.filter((item) => !(item.code === code && item.size === size)));
    },
    [changeLines],
  );

  const applyStockError = useCallback<BagContextValue['applyStockError']>(
    (message) => {
      changeLines((prev) => linesAfterStockError(prev, message));
    },
    [changeLines],
  );

  const clear = useCallback(() => changeLines(() => []), [changeLines]);

  const value = useMemo<BagContextValue>(
    () => ({
      lines: state.lines,
      ready: loaded,
      synced: !!state.owner,
      totalQty: state.lines.reduce((sum, item) => sum + item.qty, 0),
      subtotal: state.lines.reduce((sum, item) => sum + item.price * item.qty, 0),
      add,
      setQty,
      remove,
      applyStockError,
      clear,
      refresh,
    }),
    [add, applyStockError, clear, loaded, refresh, remove, setQty, state],
  );

  return createElement(BagContext.Provider, { value }, children);
}

export function useBag(): BagContextValue {
  const value = useContext(BagContext);
  if (!value) throw new Error('useBag must be used inside BagProvider');
  return value;
}
