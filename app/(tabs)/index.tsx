import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueries } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchCatalog } from '@/src/api/catalog';
import { ErrorState, PressableScale, Screen, SkeletonBlock } from '@/src/components/ui';
import { HOME_TILES } from '@/src/lib/categories';
import { tapHaptic } from '@/src/lib/haptics';
import { useWishlist } from '@/src/lib/wishlist';
import { colors, fonts, radius, space } from '@/src/theme';

export default function HomeScreen() {
  const wishlist = useWishlist();
  const [refreshing, setRefreshing] = useState(false);
  const tiles = useQueries({
    queries: HOME_TILES.map((tile) => ({
      queryKey: ['home-tile', tile.slug],
      queryFn: () => fetchCatalog({ cat: tile.slug, pageSize: 1 }),
      staleTime: 60_000,
    })),
  });

  const failed = tiles.every((tile) => tile.isError) && tiles.every((tile) => !tile.data);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all(tiles.map((tile) => tile.refetch()));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen
      wordmark
      right={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Wishlist${wishlist.codes.length ? `, ${wishlist.codes.length} saved` : ''}`}
          onPress={() => {
            tapHaptic();
            router.push('/wishlist');
          }}
          style={({ pressed }) => [styles.heart, pressed && styles.pressed]}>
          <Ionicons name={wishlist.codes.length ? 'heart' : 'heart-outline'} size={24} color={wishlist.codes.length ? colors.accent : colors.text} />
        </Pressable>
      }>
      {failed ? (
        <ErrorState message="Can't load the shop" onRetry={() => tiles.forEach((tile) => tile.refetch())} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} colors={[colors.accent]} />}>
          <View style={styles.intro}>
            <Text style={styles.eyebrow}>Rappi Sports Hub</Text>
            <Text style={styles.headline}>Gear up.{'\n'}Play harder.</Text>
          </View>
          <View style={styles.grid}>
            {HOME_TILES.map((tile, index) => {
              const query = tiles[index];
              const imageUrl = query?.data?.products[0]?.imageUrl;
              const full = tile.span === 'full';
              return (
                <PressableScale
                  key={tile.slug}
                  accessibilityRole="button"
                  accessibilityLabel={`Shop ${tile.label}`}
                  scaleTo={0.98}
                  onPress={() => {
                    tapHaptic();
                    router.push(tile.href as never);
                  }}
                  style={[styles.tile, full ? styles.full : styles.half]}>
                  {query?.isPending && !query?.data ? (
                    <SkeletonBlock style={styles.fill} />
                  ) : imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.fill} contentFit="cover" cachePolicy="disk" transition={250} />
                  ) : (
                    <View style={[styles.fill, styles.fallback]} />
                  )}
                  <View pointerEvents="none" style={styles.scrimSoft} />
                  <View pointerEvents="none" style={styles.scrimMid} />
                  <View pointerEvents="none" style={styles.scrimStrong} />
                  <View style={styles.tileFooter}>
                    <Text style={[styles.label, full && styles.labelFull]} numberOfLines={1}>
                      {tile.label}
                    </Text>
                    <View style={styles.arrow}>
                      <Ionicons name="arrow-forward" size={16} color={colors.onAccent} />
                    </View>
                  </View>
                </PressableScale>
              );
            })}
          </View>
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heart: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  content: { padding: space.screen, paddingTop: 20, paddingBottom: 32, gap: 20 },
  intro: { gap: 6 },
  eyebrow: {
    fontFamily: fonts.display,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: colors.accentText,
  },
  headline: {
    fontFamily: fonts.displayBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.text,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.gap },
  tile: {
    borderRadius: radius.folder,
    overflow: 'hidden',
    backgroundColor: colors.text,
  },
  full: { width: '100%', height: 240 },
  half: { width: '48%', flexGrow: 1, height: 200 },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  fallback: { backgroundColor: colors.text },
  scrimSoft: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '60%', backgroundColor: 'rgba(0,0,0,0.12)' },
  scrimMid: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%', backgroundColor: 'rgba(0,0,0,0.18)' },
  scrimStrong: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '24%', backgroundColor: 'rgba(0,0,0,0.3)' },
  tileFooter: {
    position: 'absolute',
    left: 14,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    flexShrink: 1,
    fontFamily: fonts.displayBold,
    fontSize: 20,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.onDark,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  labelFull: { fontSize: 26 },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
