import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchNav } from '@/src/api/catalog';
import { ErrorState, ListCard, Screen, SkeletonList } from '@/src/components/ui';
import { CATEGORY_NAMES, PRIMARY_CATEGORY_ORDER, categoryName, isHiddenCategory } from '@/src/lib/categories';
import { sectionLabel, space } from '@/src/theme';

export default function ShopScreen() {
  const nav = useQuery({
    queryKey: ['catalog-nav'],
    queryFn: fetchNav,
    staleTime: 60_000,
  });

  const counts = nav.data?.categoryCounts ?? {};
  const slugs = Object.keys(counts).filter((slug) => !isHiddenCategory(slug) && counts[slug] > 0);
  const primary = PRIMARY_CATEGORY_ORDER.filter((slug) => slugs.includes(slug));
  const more = slugs
    .filter((slug) => !PRIMARY_CATEGORY_ORDER.includes(slug as (typeof PRIMARY_CATEGORY_ORDER)[number]))
    .sort((a, b) => categoryName(a).localeCompare(categoryName(b)));

  return (
    <Screen title="Shop">
      {nav.isPending ? <SkeletonList /> : null}
      {nav.isError && !nav.data ? <ErrorState message="Can't load the shop" onRetry={() => nav.refetch()} /> : null}
      {nav.data ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={sectionLabel}>CATEGORIES</Text>
          <View style={styles.list}>
            {primary.map((slug) => (
              <ListCard
                key={slug}
                title={CATEGORY_NAMES[slug] ?? categoryName(slug)}
                subtitle={`${counts[slug]} products`}
                onPress={() => router.push(`/category/${slug}`)}
              />
            ))}
          </View>
          {more.length > 0 ? (
            <>
              <Text style={[sectionLabel, styles.more]}>MORE</Text>
              <View style={styles.list}>
                {more.map((slug) => (
                  <ListCard
                    key={slug}
                    title={categoryName(slug)}
                    subtitle={`${counts[slug]} products`}
                    onPress={() => router.push(`/category/${slug}`)}
                  />
                ))}
              </View>
            </>
          ) : null}
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.screen, gap: 8 },
  list: { gap: 8 },
  more: { marginTop: 16 },
});
