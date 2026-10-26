import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { FolderCard, Screen } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { findMenu, menuImage, NAV_MENU_KEYS, type Menu } from '@/src/lib/menus';
import { headerMenus, localized, shopTileDestination } from '@/src/lib/storefront/adapt';
import { ShopFeed } from '@/src/lib/storefront/feedSections';
import { openStorefrontRoute } from '@/src/lib/storefront/open';
import { useStorefront } from '@/src/lib/storefront/provider';
import { space } from '@/src/theme';

const NAV_MENUS = NAV_MENU_KEYS.map((key) => findMenu(key)).filter((menu): menu is Menu => !!menu);

export default function ShopScreen() {
  const { market, t } = useLocale();
  const storefront = useStorefront();
  const language = market === 'eu' ? 'fr' : 'en';
  if (storefront.enabled) {
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
  const menuCells: (Menu | null)[] = NAV_MENUS.length % 2 === 1 ? [...NAV_MENUS, null] : NAV_MENUS;
  const menuRows: (Menu | null)[][] = [];
  for (let index = 0; index < menuCells.length; index += 2) menuRows.push(menuCells.slice(index, index + 2));

  return (
    <Screen title={t('tabs.shop')}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.menus}>
          {menuRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.menuRow}>
              {row.map((menu) => (
                <View key={menu?.key ?? 'filler'} style={styles.menuCell}>
                  {menu ? (
                    <FolderCard
                      name={t(`shop.${menu.key}`)}
                      imageUrl={menuImage(menu.image)}
                      onPress={() => router.push({ pathname: '/menu/[menu]', params: { menu: menu.key } })}
                    />
                  ) : null}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.screen, paddingBottom: 40 },
  menus: { gap: space.gap },
  menuRow: { flexDirection: 'row', gap: space.gap },
  menuCell: { flex: 1 },
});
