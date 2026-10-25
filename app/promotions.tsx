import { Redirect } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { MenuGrid } from '@/src/components/MenuGrid';
import { EmptyState, Screen } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { legacyUiEnabled } from '@/src/lib/legacyUi';
import { findMenu } from '@/src/lib/menus';
import { space } from '@/src/theme';

export default function PromotionsRoute() {
  if (legacyUiEnabled()) {
    return <Redirect href={{ pathname: '/menu/[menu]', params: { menu: 'outlet' } }} />;
  }
  return <PromotionsScreen />;
}

function PromotionsScreen() {
  const { t } = useLocale();
  const menu = findMenu('outlet');
  if (!menu) {
    return (
      <Screen title={t('shop.outlet')} back>
        <EmptyState message="This page isn't available." />
      </Screen>
    );
  }
  return (
    <Screen title={t('shop.outlet')} back>
      <ScrollView contentContainerStyle={styles.content}>
        <MenuGrid nodes={menu.nodes} cat={menu.cat} crumbs={[menu.title]} menu={{ key: menu.key, path: [] }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.screen, paddingBottom: 40 },
});
