import { WishlistNavButton } from '@/src/components/HeartButton';
import { Screen } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { tapHaptic } from '@/src/lib/haptics';
import { homeTiles, localized } from '@/src/lib/storefront/adapt';
import { resolveTarget } from '@/src/lib/storefront/contract';
import { HomeFeed } from '@/src/lib/storefront/feedSections';
import { openStorefrontRoute } from '@/src/lib/storefront/open';
import { useStorefront } from '@/src/lib/storefront/provider';

export default function HomeScreen() {
  const { market } = useLocale();
  const storefront = useStorefront();
  const language = market === 'eu' ? 'fr' : 'en';
  const tiles = storefront.feed
    ? homeTiles(storefront.feed).map((tile) => ({
        key: tile.key,
        label: localized(tile.title, language),
        image: tile.image,
      }))
    : [];
  const status = storefront.feed ? 'ready' : storefront.loading || !storefront.ready ? 'loading' : 'unavailable';
  return (
    <Screen wordmark right={<WishlistNavButton />}>
      <HomeFeed
        status={status}
        tiles={tiles}
        onRetry={() => storefront.reload()}
        onOpen={(key, label) => {
          const tile = storefront.feed ? homeTiles(storefront.feed).find((item) => item.key === key) : undefined;
          const route = tile ? resolveTarget(tile.target) : null;
          if (!route) return;
          tapHaptic();
          openStorefrontRoute(route, label, [label]);
        }}
      />
    </Screen>
  );
}
