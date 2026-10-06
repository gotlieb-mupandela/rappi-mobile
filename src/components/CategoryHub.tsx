import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ALL_FOLDER, fetchCatalog, fetchHubTypes, fetchNav, subFolderKey } from '@/src/api/catalog';
import { openCatalogFolder } from '@/src/components/FolderBrowser';
import { MenuGrid } from '@/src/components/MenuGrid';
import { ProductCard } from '@/src/components/ProductCard';
import { Chip, ErrorState, PressableScale, Screen, SecondaryButton, SkeletonBlock, SkeletonGrid } from '@/src/components/ui';
import { categoryName, hubImage } from '@/src/lib/categories';
import { pressHaptic, tapHaptic } from '@/src/lib/haptics';
import { IMAGE_WIDTH, sizedImage } from '@/src/lib/images';
import { AUDIENCE_IMAGES, HUB_DESCRIPTIONS, HUB_TYPES, menuImage, type MenuNode } from '@/src/lib/menus';
import { colors, displayTitle, fonts, radius, sectionLabel, space } from '@/src/theme';

const ATHLETES = [
  { slug: 'men', label: 'Men' },
  { slug: 'women', label: 'Women' },
  { slug: 'kids', label: 'Kids' },
] as const;

const RAIL_SIZE = 10;
const SHADE = require('@/assets/images/shade.png');

export function CategoryHub({ slug }: { slug: string }) {
  const name = categoryName(slug);

  const nav = useQuery({ queryKey: ['catalog-nav'], queryFn: fetchNav, staleTime: 60_000 });
  const overview = useQuery({
    queryKey: ['hub-overview', slug, RAIL_SIZE],
    queryFn: () => fetchCatalog({ cat: slug, pageSize: RAIL_SIZE }),
    staleTime: 60_000,
  });
  const staticTypes = HUB_TYPES[slug];
  const folders = useQuery({
    queryKey: ['hub-types', slug],
    queryFn: () => fetchHubTypes(slug),
    enabled: !staticTypes,
    staleTime: 60_000,
  });
  const athletes = useQueries({
    queries: ATHLETES.map((athlete) => ({
      queryKey: ['hub-athlete', slug, athlete.slug],
      queryFn: () => fetchCatalog({ cat: slug, audience: athlete.slug, pageSize: 1 }),
      staleTime: 60_000,
    })),
  });

  const crumbs = [name];
  const types: MenuNode[] =
    staticTypes ??
    (folders.data ?? []).map((folder) => ({ key: folder.key, name: folder.name, image: folder.imageUrl, folder: folder.key }));
  const subs = nav.data?.taxonomy?.[slug] ?? [];
  const products = overview.data?.products ?? [];
  const heroImage = hubImage(slug) ?? sizedImage(products[0]?.imageUrl, IMAGE_WIDTH.full);
  const shopAll = () => openCatalogFolder({ cat: slug, folder: ALL_FOLDER, name: 'Shop all', crumbs, leaf: true });
  const openAthlete = (audience: string, label: string) => {
    if (slug === 'shoes') {
      router.push({ pathname: '/menu/[menu]', params: { menu: 'shoes', path: audience } });
      return;
    }
    openCatalogFolder({ cat: slug, folder: ALL_FOLDER, name: label, audience, crumbs });
  };
  const athleteCards = ATHLETES.map((athlete, index) => ({ ...athlete, data: athletes[index].data })).filter(
    (athlete) => (athlete.data?.total ?? 0) > 0,
  );

  if (overview.isError && !overview.data) {
    return (
      <Screen title={name} back>
        <ErrorState message="Can't load the shop" onRetry={() => overview.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen title={name} back>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          {heroImage ? (
            <Image source={{ uri: heroImage }} style={styles.fill} contentFit="cover" cachePolicy="memory-disk" transition={250} />
          ) : null}
          <Image source={SHADE} style={styles.heroShade} contentFit="fill" pointerEvents="none" />
          <View style={styles.heroText}>
            <Text style={styles.eyebrow}>Rappi Sports Hub</Text>
            <Text style={styles.heroTitle}>{name}</Text>
            {HUB_DESCRIPTIONS[slug] ? (
              <Text style={styles.heroDescription} numberOfLines={2}>
                {HUB_DESCRIPTIONS[slug]}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Shop all ${name}`}
              onPress={() => {
                pressHaptic();
                shopAll();
              }}
              style={({ pressed }) => [styles.heroButton, pressed && styles.pressed]}>
              <Text style={styles.heroButtonLabel}>Shop all</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.onAccent} />
            </Pressable>
          </View>
        </View>

        {subs.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.label, styles.padded]}>Popular</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {subs.map((sub) => (
                <Chip
                  key={sub.slug}
                  label={sub.name}
                  onPress={() =>
                    openCatalogFolder({ cat: slug, folder: subFolderKey(sub.slug), name: sub.name, crumbs, leaf: true })
                  }
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader title="Shop by type" />
          <View style={styles.padded}>
            {!staticTypes && folders.isPending ? (
              <SkeletonGrid count={4} />
            ) : (
              <MenuGrid nodes={types} cat={slug} crumbs={crumbs} variant="card" />
            )}
          </View>
        </View>

        {products.length > 0 || overview.isPending ? (
          <View style={styles.section}>
            <SectionHeader title="New in" action="View all" onAction={shopAll} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
              {overview.isPending
                ? [0, 1, 2].map((index) => <SkeletonBlock key={index} style={styles.railSkeleton} />)
                : products.map((product) => (
                    <View key={product.code} style={styles.railItem}>
                      <ProductCard product={product} />
                    </View>
                  ))}
            </ScrollView>
          </View>
        ) : null}

        {athleteCards.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Shop by athlete" />
            <View style={[styles.athletes, styles.padded]}>
              {athleteCards.map((athlete) => {
                const image = menuImage(AUDIENCE_IMAGES[athlete.slug]) ?? sizedImage(athlete.data?.products[0]?.imageUrl, IMAGE_WIDTH.card);
                return (
                  <View key={athlete.slug} style={styles.athlete}>
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityLabel={`Shop ${athlete.label}`}
                      onPress={() => {
                        tapHaptic();
                        openAthlete(athlete.slug, athlete.label);
                      }}
                      style={styles.athleteCard}>
                      {image ? <Image source={{ uri: image }} style={styles.fill} contentFit="cover" cachePolicy="memory-disk" transition={200} /> : null}
                      <Image source={SHADE} style={styles.athleteShade} contentFit="fill" pointerEvents="none" />
                      <Text style={styles.athleteName}>{athlete.label}</Text>
                    </PressableScale>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={[styles.section, styles.padded]}>
          <SecondaryButton label={`Browse all ${name}`} onPress={shopAll} />
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={styles.sectionAction}>
          <Text style={styles.sectionLink}>{action}</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.accentText} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 48 },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  pressed: { opacity: 0.85 },
  padded: { paddingHorizontal: space.screen },
  hero: { height: 360, backgroundColor: colors.text, justifyContent: 'flex-end', overflow: 'hidden' },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '75%' },
  heroText: { padding: space.screen, paddingBottom: 24, gap: 6 },
  eyebrow: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' },
  heroTitle: { fontFamily: fonts.displayBold, fontSize: 40, lineHeight: 46, letterSpacing: 0.4, textTransform: 'uppercase', color: colors.onDark },
  heroDescription: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: 'rgba(255,255,255,0.88)', maxWidth: 320 },
  heroButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    height: 44,
    paddingHorizontal: 20,
    borderRadius: radius.chip,
    backgroundColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroButtonLabel: { fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.onAccent },
  section: { marginTop: 28 },
  label: { ...sectionLabel, marginBottom: 10 },
  chips: { paddingHorizontal: space.screen, gap: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.screen,
    marginBottom: 14,
  },
  sectionTitle: { ...displayTitle, fontSize: 22 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionLink: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.accentText },
  rail: { paddingHorizontal: space.screen, gap: space.gap },
  railItem: { width: 168 },
  railSkeleton: { width: 168, height: 250, borderRadius: radius.card },
  athletes: { flexDirection: 'row', gap: 10 },
  athlete: { flex: 1 },
  athleteCard: { aspectRatio: 0.72, borderRadius: radius.card, overflow: 'hidden', backgroundColor: colors.imageWell, justifyContent: 'flex-end' },
  athleteShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%' },
  athleteName: { padding: 12, fontFamily: fonts.displayBold, fontSize: 18, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.onDark },
});
