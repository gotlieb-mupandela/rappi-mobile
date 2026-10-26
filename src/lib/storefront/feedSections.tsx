import { Image } from 'expo-image';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fonts, radius, space, theme } from '../../theme.ts';

const { colors } = theme;

export type FeedTileModel = {
  key: string;
  label: string;
  image: string | null;
  span?: 1 | 2 | null;
  tone?: 'dark' | 'light' | null;
};

type Status = 'loading' | 'unavailable' | 'ready';

const SCRIM_STEPS = [55, 48, 42, 36, 31, 26, 22, 18, 14, 10] as const;

export function StorefrontUnavailable({
  loading,
  onRetry,
  testID,
}: {
  loading: boolean;
  onRetry: () => void;
  testID: string;
}) {
  if (loading) {
    return (
      <View testID={testID} style={styles.unavailable}>
        <ActivityIndicator accessibilityLabel="Loading the shop" />
        <Text style={styles.unavailableTitle}>Loading the shop</Text>
      </View>
    );
  }
  return (
    <View testID={testID} style={styles.unavailable}>
      <Text style={styles.unavailableTitle}>Can't load the shop</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Try again" onPress={onRetry} style={styles.retry}>
        <Text style={styles.retryLabel}>Try again</Text>
      </Pressable>
    </View>
  );
}

/** Shown when the feed is loaded and this menu key is not in it. */
export function MenuUnavailable() {
  return (
    <View testID="menu-unavailable" style={styles.unavailable}>
      <Text style={styles.unavailableTitle}>This page isn't available.</Text>
    </View>
  );
}

export function HomeFeed({
  status,
  tiles,
  onRetry,
  onOpen,
}: {
  status: Status;
  tiles: FeedTileModel[];
  onRetry: () => void;
  onOpen: (key: string, label: string) => void;
}) {
  if (status !== 'ready') {
    return <StorefrontUnavailable loading={status === 'loading'} onRetry={onRetry} testID="home-unavailable" />;
  }
  return (
    <ScrollView testID="home-feed" contentContainerStyle={styles.homeContent}>
      <View style={styles.homeGrid}>
        {tiles.map((tile) => (
          <Pressable
            key={tile.key}
            accessibilityRole="button"
            accessibilityLabel={tile.label}
            onPress={() => onOpen(tile.key, tile.label)}
            style={({ pressed }) => [
              styles.homeTile,
              tile.span === 2 ? styles.homeWide : styles.homeHalf,
              tile.tone === 'light' && styles.homeLight,
              pressed && styles.pressed,
            ]}>
            {tile.image ? (
              <Image source={{ uri: tile.image }} style={styles.fill} contentFit="cover" cachePolicy="memory-disk" transition={250} />
            ) : null}
            {tile.image
              ? SCRIM_STEPS.map((height) => <View key={height} pointerEvents="none" style={[styles.scrim, { height: `${height}%` }]} />)
              : null}
            <View pointerEvents="none" style={styles.homeLabelWrap}>
              <Text style={[styles.homeLabel, tile.tone === 'light' && styles.homeLabelLight]} numberOfLines={1}>
                {tile.label}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

export function ShopFeed({
  status,
  menus,
  onRetry,
  onOpen,
}: {
  status: Status;
  menus: FeedTileModel[];
  onRetry: () => void;
  onOpen: (key: string, label: string) => void;
}) {
  if (status !== 'ready') {
    return <StorefrontUnavailable loading={status === 'loading'} onRetry={onRetry} testID="shop-unavailable" />;
  }
  const cells: (FeedTileModel | null)[] = menus.length % 2 === 1 ? [...menus, null] : [...menus];
  const rows: (FeedTileModel | null)[][] = [];
  for (let index = 0; index < cells.length; index += 2) rows.push(cells.slice(index, index + 2));
  return (
    <ScrollView testID="shop-feed" contentContainerStyle={styles.shopContent}>
      <View style={styles.shopMenus}>
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.shopRow}>
            {row.map((menu, cellIndex) =>
              menu ? (
                <View key={menu.key} style={styles.shopCell}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={menu.label}
                    onPress={() => onOpen(menu.key, menu.label)}
                    style={({ pressed }) => [pressed && styles.pressed]}>
                    <View style={styles.shopImage}>
                      {menu.image ? (
                        <Image source={{ uri: menu.image }} style={styles.fill} contentFit="cover" cachePolicy="memory-disk" transition={180} />
                      ) : null}
                    </View>
                    <Text style={styles.shopName} numberOfLines={2}>
                      {menu.label}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View key={`filler-${cellIndex}`} style={styles.shopCell} />
              ),
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function HubCover({ image }: { image: string | null }) {
  if (!image) return <View testID="hub-cover-empty" style={styles.hubCover} />;
  return <Image testID="hub-cover" source={{ uri: image }} style={styles.hubCover} contentFit="cover" cachePolicy="memory-disk" transition={250} />;
}

export function HubTypeGrid({
  tiles,
  onOpen,
}: {
  tiles: FeedTileModel[];
  onOpen: (key: string, label: string) => void;
}) {
  if (tiles.length === 0) return null;
  return (
    <View testID="hub-types" style={styles.typeGrid}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.key}
          accessibilityRole="button"
          accessibilityLabel={tile.label}
          onPress={() => onOpen(tile.key, tile.label)}
          style={styles.typeCell}>
          <View style={styles.typeImage}>
            {tile.image ? (
              <Image source={{ uri: tile.image }} style={styles.fill} contentFit="cover" cachePolicy="memory-disk" transition={180} />
            ) : null}
          </View>
          <Text style={styles.typeName} numberOfLines={1}>
            {tile.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function AthleteCards({
  tiles,
  onOpen,
}: {
  tiles: FeedTileModel[];
  onOpen: (key: string, label: string) => void;
}) {
  if (tiles.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} testID="athlete-cards" contentContainerStyle={styles.athletes}>
      {tiles.map((tile) => (
        <Pressable
          key={tile.key}
          accessibilityRole="button"
          accessibilityLabel={tile.label}
          onPress={() => onOpen(tile.key, tile.label)}
          style={styles.athlete}>
          <View style={styles.athleteCard}>
            {tile.image ? (
              <Image testID={`athlete-image-${tile.key}`} source={{ uri: tile.image }} style={styles.fill} contentFit="cover" cachePolicy="memory-disk" transition={200} />
            ) : (
              <View testID={`athlete-no-image-${tile.key}`} style={styles.fill} />
            )}
            <View pointerEvents="none" style={styles.athleteShade} />
            <Text style={styles.athleteName}>{tile.label}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function AudienceChips({
  tiles,
  selected,
  allLabel,
  onSelect,
}: {
  tiles: { key: string; label: string }[];
  selected: string | undefined;
  allLabel: string;
  onSelect: (key: string | undefined) => void;
}) {
  if (tiles.length === 0) return null;
  return (
    <View testID="audience-chips" style={styles.chips}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={allLabel}
        onPress={() => onSelect(undefined)}
        style={[styles.chip, selected === undefined && styles.chipSelected]}>
        <Text style={[styles.chipLabel, selected === undefined && styles.chipLabelSelected]}>{allLabel}</Text>
      </Pressable>
      {tiles.map((tile) => (
        <Pressable
          key={tile.key}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === tile.key }}
          accessibilityLabel={tile.label}
          onPress={() => onSelect(tile.key)}
          style={[styles.chip, selected === tile.key && styles.chipSelected]}>
          <Text style={[styles.chipLabel, selected === tile.key && styles.chipLabelSelected]}>{tile.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  unavailable: { padding: space.screen, paddingTop: 48, alignItems: 'center', gap: 12 },
  unavailableTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.text, textAlign: 'center' },
  retry: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: radius.chip,
    borderWidth: 1.5,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryLabel: { fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.text },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
  homeContent: { padding: space.screen, paddingTop: 16, paddingBottom: 32 },
  homeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  homeTile: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#1a1c1e' },
  homeHalf: { width: '48%', flexGrow: 1, height: 210 },
  homeWide: { width: '100%', height: 210 },
  homeLight: { backgroundColor: '#f3f0ea' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.045)' },
  homeLabelWrap: { position: 'absolute', left: 14, right: 14, bottom: 14 },
  homeLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.onDark,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  homeLabelLight: { color: colors.text, textShadowColor: 'transparent' },
  shopContent: { padding: space.screen, paddingBottom: 40 },
  shopMenus: { gap: space.gap },
  shopRow: { flexDirection: 'row', gap: space.gap },
  shopCell: { flex: 1 },
  shopImage: { aspectRatio: 0.75, width: '100%', backgroundColor: colors.imageWell, overflow: 'hidden' },
  shopName: {
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 4,
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
    color: colors.text,
  },
  hubCover: { width: '100%', height: 360 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.gap },
  typeCell: { width: '47%', flexGrow: 1 },
  typeImage: { aspectRatio: 1, width: '100%', borderRadius: radius.card, backgroundColor: colors.imageWell, overflow: 'hidden' },
  typeName: { marginTop: 10, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.text },
  athletes: { flexDirection: 'row', gap: 10, paddingHorizontal: space.screen },
  athlete: { width: 148 },
  athleteCard: {
    aspectRatio: 0.72,
    width: '100%',
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: colors.imageWell,
    justifyContent: 'flex-end',
  },
  athleteShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%', backgroundColor: 'rgba(0,0,0,0.35)' },
  athleteName: {
    padding: 12,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.onDark,
  },
  chips: { flexDirection: 'row', gap: 8 },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.inverse },
  chipLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  chipLabelSelected: { color: colors.onInverse },
});
