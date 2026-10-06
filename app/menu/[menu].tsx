import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { MenuGrid } from '@/src/components/MenuGrid';
import { EmptyState, PathTrail, Screen } from '@/src/components/ui';
import { findMenu, parseMenuPath, resolveMenuPath } from '@/src/lib/menus';
import { space } from '@/src/theme';

export default function MenuScreen() {
  const params = useLocalSearchParams<{ menu: string; path?: string }>();
  const menu = findMenu(params.menu);
  const path = parseMenuPath(params.path);
  const resolved = menu ? resolveMenuPath(menu, path) : null;

  if (!menu || !resolved) {
    return (
      <Screen title="Shop" back>
        <EmptyState message="This page isn't available." action="Back" onPress={() => router.back()} />
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
});
