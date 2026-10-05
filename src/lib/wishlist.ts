import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createQueuedJsonWriter, readStoredJson } from '@/src/lib/deviceStorage';

const KEY = 'wishlist';
const writeWishlist = createQueuedJsonWriter(KEY);

async function readWishlist(): Promise<string[]> {
  const parsed = await readStoredJson<unknown>(KEY, []);
  if (!Array.isArray(parsed)) return [];
  return [...new Set(parsed.filter((code): code is string => typeof code === 'string' && !!code.trim()))];
}

type WishlistContextValue = {
  codes: string[];
  ready: boolean;
  has: (code: string) => boolean;
  toggle: (code: string) => void;
  drop: (code: string) => void;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [codes, setCodes] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    readWishlist().then((next) => {
      setCodes(next);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) writeWishlist(codes);
  }, [codes, ready]);

  const toggle = useCallback((code: string) => {
    setCodes((prev) => (prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]));
  }, []);

  const drop = useCallback((code: string) => {
    setCodes((prev) => (prev.includes(code) ? prev.filter((item) => item !== code) : prev));
  }, []);

  const value = useMemo<WishlistContextValue>(
    () => ({
      codes,
      ready,
      has: (code) => codes.includes(code),
      toggle,
      drop,
    }),
    [codes, drop, ready, toggle],
  );

  return createElement(WishlistContext.Provider, { value }, children);
}

export function useWishlist(): WishlistContextValue {
  const value = useContext(WishlistContext);
  if (!value) throw new Error('useWishlist must be used inside WishlistProvider');
  return value;
}
