import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { WishlistNavButton } from '@/src/components/HeartButton';
import { Screen } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { categoryName, HOME_TILES } from '@/src/lib/categories';
import { tapHaptic } from '@/src/lib/haptics';
import { homeTiles, localized } from '@/src/lib/storefront/adapt';
import { resolveTarget } from '@/src/lib/storefront/contract';
import { HomeFeed } from '@/src/lib/storefront/feedSections';
import { openStorefrontRoute } from '@/src/lib/storefront/open';
import { useStorefront } from '@/src/lib/storefront/provider';
import { makeStyles } from '@/src/lib/theme';
import { fonts, space } from '@/src/theme';

const SCRIM_STEPS = [55, 48, 42, 36, 31, 26, 22, 18, 14, 10] as const;

export default function HomeScreen() {
  const { market, t } = useLocale();
  const styles = useStyles();
  const storefront = useStorefront();
  const language = market === 'eu' ? 'fr' : 'en';
  if (storefront.enabled) {
    const tiles = storefront.feed
      ? homeTiles(storefront.feed).map((tile) => ({
          key: tile.key,
          label: localized(tile.title, language),
          image: tile.image,
          span: tile.span,
          tone: tile.tone,
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
  const tileLabel = (key: string, fallback: string) => {
    if (key === 'teamwear') return t('home.teamwear');
    if (key === 'running') return t('home.running');
    if (key === 'footwear') return t('home.footwear');
    if (key === 'kids') return t('common.kids');
    return categoryName(key, language) || fallback;
  };
  return (
    <Screen wordmark right={<WishlistNavButton />}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {HOME_TILES.map((tile) => {
            const light = tile.tone === 'light';
            const label = tileLabel(tile.key, tile.label);
            return (
              <Pressable
                key={tile.key}
                accessibilityRole="button"
                accessibilityLabel={t('home.shop', { name: label })}
                onPress={() => {
                  tapHaptic();
                  router.push(tile.href as never);
                }}
                style={({ pressed }) => [
                  styles.tile,
                  tile.span === 'full' ? styles.full : styles.half,
                  light && styles.tileLight,
                  pressed && styles.tilePressed,
                ]}>
                <Image source={{ uri: tile.image }} style={styles.fill} contentFit="cover" cachePolicy="memory-disk" transition={250} />
                {light
                  ? null
                  : SCRIM_STEPS.map((height) => (
                      <View key={height} pointerEvents="none" style={[styles.scrim, { height: `${height}%` }]} />
                    ))}
                <View pointerEvents="none" style={light ? styles.labelCentre : styles.labelBottom}>
                  <Text style={[styles.label, light && styles.labelDark]} numberOfLines={1}>
                    {label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  content: { padding: space.screen, paddingTop: 16, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1a1c1e',
  },
  tileLight: {
    backgroundColor: '#f5f5f5',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tilePressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  full: { width: '100%', height: 210 },
  half: { width: '48%', flexGrow: 1, height: 210 },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.045)' },
  labelBottom: { position: 'absolute', left: 14, right: 14, bottom: 14 },
  labelCentre: { position: 'absolute', left: 14, right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  label: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.onDark,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  labelDark: { color: '#121212', textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0 },
}));
