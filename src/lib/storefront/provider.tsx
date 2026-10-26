import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { apiFetch } from '@/src/api/client';
import type { Product } from '@/src/api/types';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { categoryName } from '@/src/lib/categories';
import { categoryNode, indexProducts, lineByCode, localized } from '@/src/lib/storefront/adapt';
import { keyValueStore, resolveStorefront } from '@/src/lib/storefront/cache';
import { productLabel, STOREFRONT_PATH } from '@/src/lib/storefront/contract';
import { dataDrivenStorefrontEnabled } from '@/src/lib/storefront/flag';
import type { MobileStorefront, StorefrontProduct } from '@/src/lib/storefront/types';

type StorefrontValue = {
  enabled: boolean;
  ready: boolean;
  feed: MobileStorefront | null;
  productsByCode: Map<string, StorefrontProduct>;
  linesByCode: Map<string, string> | null;
  reload: () => void;
};

const EMPTY_PRODUCTS = new Map<string, StorefrontProduct>();

const StorefrontContext = createContext<StorefrontValue>({
  enabled: false,
  ready: true,
  feed: null,
  productsByCode: EMPTY_PRODUCTS,
  linesByCode: null,
  reload: () => undefined,
});

function productionBuild(): boolean {
  return typeof __DEV__ === 'undefined' ? process.env.NODE_ENV === 'production' : !__DEV__;
}

export function StorefrontProvider({ children }: { children: ReactNode }) {
  const enabled = dataDrivenStorefrontEnabled();
  const [ready, setReady] = useState(!enabled);
  const [feed, setFeed] = useState<MobileStorefront | null>(null);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancel = false;
    resolveStorefront({
      enabled,
      production: productionBuild(),
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      store: keyValueStore(AsyncStorage),
      fetchFeed: () => apiFetch<unknown>(STOREFRONT_PATH, { fallbackMessage: "Can't load the shop" }),
    })
      .then((next) => {
        if (!cancel) setFeed(next);
      })
      .finally(() => {
        if (!cancel) setReady(true);
      });
    return () => {
      cancel = true;
    };
  }, [attempt, enabled]);

  const productsByCode = useMemo(() => indexProducts(feed), [feed]);
  const linesByCode = useMemo(() => lineByCode(feed), [feed]);
  const value = useMemo<StorefrontValue>(
    () => ({ enabled, ready, feed, productsByCode, linesByCode, reload }),
    [enabled, feed, linesByCode, productsByCode, ready, reload],
  );

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront(): StorefrontValue {
  return useContext(StorefrontContext);
}

export function useCategoryTitle(slug: string | null | undefined): string {
  const { market } = useLocale();
  const { enabled, feed } = useStorefront();
  const language = market === 'eu' ? 'fr' : 'en';
  if (enabled && feed && slug) {
    const node = categoryNode(feed, slug);
    if (node) return localized(node.title, language);
  }
  return categoryName(slug, language);
}

export function usePresentedProduct(product: Product | undefined): {
  name: string;
  imageUrl: string | undefined;
  feedImages: string[] | null;
} {
  const { market } = useLocale();
  const { enabled, productsByCode } = useStorefront();
  const language = market === 'eu' ? 'fr' : 'en';
  if (!product) return { name: '', imageUrl: undefined, feedImages: null };
  const catalogName = product.displayName || product.name;
  if (!enabled) return { name: catalogName, imageUrl: product.imageUrl, feedImages: null };
  const overlay = productsByCode.get(product.code);
  const label = overlay ? productLabel(language, overlay) : null;
  return {
    name: label ?? catalogName,
    imageUrl: overlay?.cardImage || product.imageUrl,
    feedImages: overlay && overlay.images.length > 0 ? overlay.images : null,
  };
}
