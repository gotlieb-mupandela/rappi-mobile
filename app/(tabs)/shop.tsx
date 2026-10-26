import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { FolderCard, Screen } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { findMenu, menuImage, NAV_MENU_KEYS, type Menu } from '@/src/lib/menus';
import { hasVisibleChildren, headerMenus, localized } from '@/src/lib/storefront/adapt';
import { resolveTarget } from '@/src/lib/storefront/contract';
import { openStorefrontRoute } from '@/src/lib/storefront/open';
import { useStorefront } from '@/src/lib/storefront/provider';
import { space } from '@/src/theme';

const NAV_MENUS = NAV_MENU_KEYS.map((key) => findMenu(key)).filter((menu): menu is Menu => !!menu);

export default function ShopScreen() {
  const { market, t } = useLocale();
  const storefront = useStorefront();
  const language = market === 'eu' ? 'fr' : 'en';
  const feedMenus = storefront.enabled && storefront.feed ? headerMenus(storefront.feed) : [];
  if (feedMenus.length > 0 && storefront.feed) {
    const feed = storefront.feed;
    const cells = feedMenus.length % 2 === 1 ? [...feedMenus, null] : feedMenus;
    const rows: typeof cells[] = [];
    for (let index = 0; index < cells.length; index += 2) rows.push(cells.slice(index, index + 2));
    return (
      <Screen title={t('tabs.shop')}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.menus}>
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.menuRow}>
                {row.map((menu) => {
                  if (!menu) return <View key="filler" style={styles.menuCell} />;
                  const label = localized(menu.title, language);
                  return (
                    <View key={menu.key} style={styles.menuCell}>
                      <FolderCard
                        name={label}
                        imageUrl={menu.image ?? undefined}
                        onPress={() => {
                          if (hasVisibleChildren(feed, menu.key)) {
                            router.push({ pathname: '/menu/[menu]', params: { menu: menu.key } });
                            return;
                          }
                          const route = resolveTarget(menu.target);
                          if (!route) return;
                          openStorefrontRoute(route, label, [label]);
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
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
