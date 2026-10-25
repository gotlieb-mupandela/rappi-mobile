import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/src/api/client';
import { legacyUiEnabled } from '@/src/lib/legacyUi';
import type { StorefrontMenus } from '@/src/lib/storefront';

export type Storefront = {
  homeTiles: Record<string, string>;
  menus: StorefrontMenus;
  hubCovers: Record<string, string>;
};

export function fetchStorefront(): Promise<Storefront> {
  return apiFetch<Storefront>('/api/mobile/storefront', { fallbackMessage: "Can't load the shop" });
}

/** Disabled while the legacy UI is on, so the current screens never request it. */
export function useStorefront() {
  return useQuery({
    queryKey: ['storefront'],
    queryFn: fetchStorefront,
    enabled: !legacyUiEnabled(),
    staleTime: 10 * 60_000,
  });
}
