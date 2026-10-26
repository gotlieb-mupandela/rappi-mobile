import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MenuGrid } from '@/src/components/MenuGrid';
import { EmptyState, FolderCard, PathTrail, Screen } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { findMenu, parseMenuPath, resolveMenuPath } from '@/src/lib/menus';
import { goBack } from '@/src/lib/navigation';
import { hasVisibleChildren, localized, menuLevel } from '@/src/lib/storefront/adapt';
import { resolveTarget } from '@/src/lib/storefront/contract';
import { MenuUnavailable, StorefrontUnavailable } from '@/src/lib/storefront/feedSections';
import { openStorefrontRoute } from '@/src/lib/storefront/open';
import { useStorefront } from '@/src/lib/storefront/provider';
import { fonts, space } from '@/src/theme';

export default function MenuScreen() {
  const params = useLocalSearchParams<{ menu: string; path?: string }>();
  const storefront = useStorefront();
  const { market } = useLocale();
  const path = parseMenuPath(params.path);
  const language = market === 'eu' ? 'fr' : 'en';
  const driven = storefront.enabled && storefront.feed ? menuLevel(storefront.feed, params.menu, path) : null;

  if (storefront.enabled && !storefront.feed) {
    return (
      <Screen title="Shop" back>
        <StorefrontUnavailable
          loading={storefront.loading || !storefront.ready}
          onRetry={() => storefront.reload()}
          testID="menu-feed"
        />
      </Screen>
    );
  }

  if (storefront.enabled && storefront.feed) {
    if (!driven) {
      return (
        <Screen title="Shop" back>
          <MenuUnavailable />
        </Screen>
      );
    }
    const feed = storefront.feed;
    const crumbs = driven.trail.map((node) => localized(node.title, language));
    const current = driven.trail[driven.trail.length - 1];
    const description = localized(current.description, language).trim();
    const parts = crumbs.map((label, index) => {
      const pops = crumbs.length - 1 - index;
      return {
        label,
        onPress: pops > 0 ? () => (router.canDismiss() ? router.dismiss(pops) : router.back()) : undefined,
      };
    });
    const cells = driven.nodes.length % 2 === 1 ? [...driven.nodes, null] : driven.nodes;
    const rows: typeof cells[] = [];
    for (let index = 0; index < cells.length; index += 2) rows.push(cells.slice(index, index + 2));
    return (
      <Screen title={localized(current.title, language)} back>
        <PathTrail parts={parts} />
        <ScrollView contentContainerStyle={styles.content}>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <View style={styles.grid}>
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.row}>
                {row.map((node) => {
                  if (!node) return <View key="filler" style={styles.cell} />;
                  const label = localized(node.title, language);
                  return (
                    <View key={node.key} style={styles.cell}>
                      <FolderCard
                        name={label}
                        imageUrl={node.image ?? undefined}
                        onPress={() => {
                          if (hasVisibleChildren(feed, node.key)) {
                            router.push({
                              pathname: '/menu/[menu]',
                              params: { menu: params.menu, path: [...path, node.key].join('/') },
                            });
                            return;
                          }
                          const route = resolveTarget(node.target);
                          if (!route) return;
                          openStorefrontRoute(route, label, crumbs);
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

  const menu = findMenu(params.menu);
  const resolved = menu ? resolveMenuPath(menu, path) : null;

  if (!menu || !resolved) {
    return (
      <Screen title="Shop" back>
        <EmptyState message="This page isn't available." action="Back" onPress={goBack} />
      </Screen>
    );
  }

  const last = resolved.trail[resolved.trail.length - 1];
  const crumbs = [menu.title, ...resolved.trail.map((step) => step.node.name)];
  const parts = crumbs.map((label, index) => {
    const pops = crumbs.length - 1 - index;
    return {
      label,
      onPress: pops > 0 ? () => (router.canDismiss() ? router.dismiss(pops) : router.back()) : undefined,
    };
  });

  return (
    <Screen title={last?.node.name ?? menu.title} back>
      <PathTrail parts={parts} />
      <ScrollView contentContainerStyle={styles.content}>
        <MenuGrid
          nodes={resolved.nodes}
          cat={last?.cat ?? menu.cat}
          audience={last ? last.audience : menu.audience}
          crumbs={crumbs}
          menu={{ key: menu.key, path }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.screen, paddingBottom: 40 },
  description: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginBottom: 16 },
  grid: { gap: space.gap },
  row: { flexDirection: 'row', gap: space.gap },
  cell: { flex: 1 },
});
