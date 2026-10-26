import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { apiFetch } from '@/src/api/client';
import type { Product } from '@/src/api/types';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { categoryNode, indexProducts, lineByCode, localized } from '@/src/lib/storefront/adapt';
import { keyValueStore, resolveStorefront } from '@/src/lib/storefront/cache';
import { readApprovedSnapshot } from '@/src/lib/storefront/snapshot';
import { productLabel, STOREFRONT_PATH } from '@/src/lib/storefront/contract';
import type { MobileStorefront, StorefrontProduct } from '@/src/lib/storefront/types';

type StorefrontValue = {
  ready: boolean;
  /** True while a storefront fetch is in flight. */
  loading: boolean;
  feed: MobileStorefront | null;
  productsByCode: Map<string, StorefrontProduct>;
  linesByCode: Map<string, string> | null;
  reload: () => void;
};

const EMPTY_PRODUCTS = new Map<string, StorefrontProduct>();

const StorefrontContext = createContext<StorefrontValue>({
  ready: true,
  loading: false,
  feed: null,
  productsByCode: EMPTY_PRODUCTS,
  linesByCode: null,
  reload: () => undefined,
});

function productionBuild(): boolean {
  return typeof __DEV__ === 'undefined' ? process.env.NODE_ENV === 'production' : !__DEV__;
}

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<MobileStorefront | null>(null);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => {
    setLoading(true);
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    resolveStorefront({
      production: productionBuild(),
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      store: keyValueStore(AsyncStorage),
      fetchFeed: () => apiFetch<unknown>(STOREFRONT_PATH, { fallbackMessage: "Can't load the shop" }),
      readSnapshot: readApprovedSnapshot,
    })
      .then((next) => {
        if (!cancel) setFeed(next);
      })
      .finally(() => {
        if (!cancel) {
          setLoading(false);
          setReady(true);
        }
      });
    return () => {
      cancel = true;
    };
  }, [attempt]);

  const productsByCode = useMemo(() => indexProducts(feed), [feed]);
  const linesByCode = useMemo(() => lineByCode(feed), [feed]);
  const value = useMemo<StorefrontValue>(
    () => ({ ready, loading, feed, productsByCode, linesByCode, reload }),
    [feed, linesByCode, loading, productsByCode, ready, reload],
  );

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront(): StorefrontValue {
  return useContext(StorefrontContext);
}

export function useCategoryTitle(slug: string | null | undefined): string {
  const { market, t } = useLocale();
  const { feed } = useStorefront();
  const language = market === 'eu' ? 'fr' : 'en';
  if (feed && slug) {
    const node = categoryNode(feed, slug);
    if (node) return localized(node.title, language);
  }
  return t('tabs.shop');
}

export function usePresentedProduct(product: Product | undefined): {
  name: string;
  imageUrl: string | undefined;
  feedImages: string[] | null;
  /** Feed pack badge. Null when this code is not in the feed or the feed has no pack label. */
  packLabel: string | null;
} {
  const { market } = useLocale();
  const { productsByCode } = useStorefront();
  const language = market === 'eu' ? 'fr' : 'en';
  if (!product) return { name: '', imageUrl: undefined, feedImages: null, packLabel: null };
  const catalogName = product.displayName || product.name;
  const overlay = productsByCode.get(product.code);
  const label = overlay ? productLabel(language, overlay) : null;
  return {
    name: label ?? catalogName,
    imageUrl: overlay?.cardImage || product.imageUrl,
    feedImages: overlay && overlay.images.length > 0 ? overlay.images : null,
    packLabel: overlay?.packLabel ?? null,
  };
}
