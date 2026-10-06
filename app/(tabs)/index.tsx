import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { WishlistNavButton } from '@/src/components/HeartButton';
import { Screen } from '@/src/components/ui';
import { HOME_TILES } from '@/src/lib/categories';
import { tapHaptic } from '@/src/lib/haptics';
import { colors, fonts, space } from '@/src/theme';

const SCRIM_STEPS = [55, 48, 42, 36, 31, 26, 22, 18, 14, 10] as const;

export default function HomeScreen() {
  return (
    <Screen wordmark right={<WishlistNavButton />}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {HOME_TILES.map((tile) => {
            const light = tile.tone === 'light';
            return (
              <Pressable
                key={tile.key}
                accessibilityRole="button"
                accessibilityLabel={`Shop ${tile.label}`}
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
                    {tile.label}
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

const styles = StyleSheet.create({
  content: { padding: space.screen, paddingTop: 16, paddingBottom: 32 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1a1c1e',
  },
  tileLight: {
    backgroundColor: colors.surface,
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
  labelDark: { color: colors.text, textShadowColor: 'transparent', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 0 },
});
