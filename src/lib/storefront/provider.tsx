import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { apiFetch } from '@/src/api/client';
import type { Product } from '@/src/api/types';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { categoryNode, indexProducts, lineByCode, localized } from '@/src/lib/storefront/adapt';
import { keyValueStore, readFreshStorefront, resolveStorefront, storefrontRefreshOnState } from '@/src/lib/storefront/cache';
import { feedPathEnabled } from '@/src/lib/storefront/flag';
import { presentProduct, type PresentedProduct } from '@/src/lib/storefront/present';
import { readApprovedSnapshot } from '@/src/lib/storefront/snapshot';
import { STOREFRONT_PATH } from '@/src/lib/storefront/contract';
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
    const store = keyValueStore(AsyncStorage);
    const load = {
      production: productionBuild(),
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      store,
      fetchFeed: () => apiFetch<unknown>(STOREFRONT_PATH, { fallbackMessage: "Can't load the shop" }),
      readSnapshot: readApprovedSnapshot,
    };
    // Show a copy from the last minute while this open refetches.
    void readFreshStorefront(store).then((cached) => {
      if (!cancel && cached) setFeed((current) => current ?? cached);
    });
    void resolveStorefront(load)
      .then((next) => {
        if (cancel) return;
        if (next) setFeed(next);
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

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (storefrontRefreshOnState(state)) reload();
    });
    return () => subscription.remove();
  }, [reload]);

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

export function usePresentedProduct(product: Product | undefined): PresentedProduct & {
  /** Gallery from the feed. Null when the card should use the catalog gallery. */
  feedImages: string[] | null;
} {
  const { market } = useLocale();
  const { productsByCode } = useStorefront();
  const language = market === 'eu' ? 'fr' : 'en';
  const rollback = !feedPathEnabled();
  if (!product) {
    const empty = presentProduct(language, market, null, undefined, rollback);
    return { ...empty, feedImages: null };
  }
  const overlay = productsByCode.get(product.code);
  const presented = presentProduct(
    language,
    market,
    rollback ? null : overlay,
    {
      name: product.displayName || product.name,
      imageUrl: product.imageUrl,
      images: product.images,
      price: product.price,
    },
    rollback,
  );
  return {
    ...presented,
    feedImages: presented.fromFeedGallery ? presented.images : null,
  };
}
