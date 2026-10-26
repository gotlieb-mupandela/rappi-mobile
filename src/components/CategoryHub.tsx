import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ALL_FOLDER, fetchCatalog, fetchNav, subFolderKey } from '@/src/api/catalog';
import { openCatalogFolder } from '@/src/components/FolderBrowser';
import { ProductCard } from '@/src/components/ProductCard';
import { Chip, ErrorState, Screen, SecondaryButton, SkeletonBlock } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { pressHaptic } from '@/src/lib/haptics';
import { audienceNodes, categoryHubImage, categoryNode, foldersForCategory, localized } from '@/src/lib/storefront/adapt';
import { resolveTarget } from '@/src/lib/storefront/contract';
import { AthleteCards, HubCover, HubTypeGrid, StorefrontUnavailable } from '@/src/lib/storefront/feedSections';
import { openStorefrontRoute } from '@/src/lib/storefront/open';
import { useCategoryTitle, useStorefront } from '@/src/lib/storefront/provider';
import type { StorefrontLanguage } from '@/src/lib/storefront/types';
import { makeStyles, useTheme } from '@/src/lib/theme';
import { fonts, radius, space } from '@/src/theme';

const RAIL_SIZE = 10;
const SHADE = require('@/assets/images/shade.png');

export function CategoryHub({ slug }: { slug: string }) {
  const { market } = useLocale();
  const { colors } = useTheme();
  const styles = useStyles();
  const storefront = useStorefront();
  const name = useCategoryTitle(slug);
  const language: StorefrontLanguage = market === 'eu' ? 'fr' : 'en';
  const feed = storefront.feed;
  const feedFolders = feed ? foldersForCategory(feed, slug) : [];
  const category = feed ? categoryNode(feed, slug) : undefined;
  const feedDescription = category ? localized(category.description, language).trim() : '';
  const feedImage = feed ? categoryHubImage(feed, slug) : null;
  const athletesFromFeed = feed ? audienceNodes(feed) : [];

  const nav = useQuery({ queryKey: ['catalog-nav'], queryFn: fetchNav, staleTime: 60_000 });
  const overview = useQuery({
    queryKey: ['hub-overview', slug, RAIL_SIZE],
    queryFn: () => fetchCatalog({ cat: slug, pageSize: RAIL_SIZE }),
    staleTime: 60_000,
  });

  const crumbs = [name];
  const subs = nav.data?.taxonomy?.[slug] ?? [];
  const products = overview.data?.products ?? [];
  const shopAll = () => openCatalogFolder({ cat: slug, folder: ALL_FOLDER, name: 'Shop all', crumbs, leaf: true });

  if (!feed) {
    return (
      <Screen title={name} back>
        <StorefrontUnavailable
          loading={storefront.loading || !storefront.ready}
          onRetry={() => storefront.reload()}
          testID="hub-unavailable"
        />
      </Screen>
    );
  }

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
          <HubCover image={feedImage} />
          <Image source={SHADE} style={styles.heroShade} contentFit="fill" pointerEvents="none" />
          <View style={styles.heroText}>
            <Text style={styles.eyebrow}>Rappi Sports Hub</Text>
            <Text style={styles.heroTitle}>{name}</Text>
            {feedDescription ? (
              <Text style={styles.heroDescription} numberOfLines={2}>
                {feedDescription}
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

        {feedFolders.length === 0 ? null : (
          <View style={styles.section}>
            <SectionHeader title="Shop by type" />
            <View style={styles.padded}>
              <HubTypeGrid
                tiles={feedFolders.map((node) => ({
                  key: node.key,
                  label: localized(node.title, language),
                  image: node.image,
                }))}
                onOpen={(key, label) => {
                  const node = feedFolders.find((item) => item.key === key);
                  const route = node ? resolveTarget(node.target) : null;
                  if (!route) return;
                  openStorefrontRoute(route, label, crumbs);
                }}
              />
            </View>
          </View>
        )}

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

        {athletesFromFeed.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader title="Shop by athlete" />
            <AthleteCards
              tiles={athletesFromFeed.map((node) => ({
                key: node.key,
                label: localized(node.title, language),
                image: node.image,
              }))}
              onOpen={(key, label) => {
                const node = athletesFromFeed.find((item) => item.key === key);
                const route = node ? resolveTarget(node.target) : null;
                if (!route) return;
                openStorefrontRoute(route, label, crumbs);
              }}
            />
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
  const { colors } = useTheme();
  const styles = useStyles();
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

const useStyles = makeStyles(({ colors, displayTitle, sectionLabel }) => ({
  content: { paddingBottom: 48 },
  pressed: { opacity: 0.85 },
  padded: { paddingHorizontal: space.screen },
  hero: { height: 360, backgroundColor: '#121212', justifyContent: 'flex-end', overflow: 'hidden' },
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
}));
