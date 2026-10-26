import { router } from 'expo-router';

import { Screen } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { headerMenus, localized, shopTileDestination } from '@/src/lib/storefront/adapt';
import { ShopFeed } from '@/src/lib/storefront/feedSections';
import { openStorefrontRoute } from '@/src/lib/storefront/open';
import { useStorefront } from '@/src/lib/storefront/provider';

export default function ShopScreen() {
  const { market, t } = useLocale();
  const storefront = useStorefront();
  const language = market === 'eu' ? 'fr' : 'en';
  const menus = storefront.feed
    ? headerMenus(storefront.feed).map((menu) => ({
        key: menu.key,
        label: localized(menu.title, language),
        image: menu.image,
      }))
    : [];
  const status = storefront.feed ? 'ready' : storefront.loading || !storefront.ready ? 'loading' : 'unavailable';
  return (
    <Screen title={t('tabs.shop')}>
      <ShopFeed
        status={status}
        menus={menus}
        onRetry={() => storefront.reload()}
        onOpen={(key, label) => {
          if (!storefront.feed) return;
          const destination = shopTileDestination(storefront.feed, key);
          if (!destination) return;
          if (destination.kind === 'menu') {
            router.push({ pathname: '/menu/[menu]', params: { menu: destination.menu } });
            return;
          }
          openStorefrontRoute(destination.route, label, [label]);
        }}
      />
    </Screen>
  );
}
