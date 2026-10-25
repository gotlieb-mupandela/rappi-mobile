import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { fetchFolderCatalog } from '@/src/api/catalog';
import type { CatalogQuery } from '@/src/api/types';
import { ProductCard } from '@/src/components/ProductCard';
import { Chip, EmptyState, ErrorState, SkeletonGrid } from '@/src/components/ui';
import { lineName, sectionProducts } from '@/src/lib/folderSections';
import { makeStyles } from '@/src/lib/theme';
import { fonts, space } from '@/src/theme';

export { lineName, sectionProducts };

const PAGE_SIZE = 24;

type Props = {
  query: Omit<CatalogQuery, 'page' | 'pageSize'>;
  byLine: boolean;
  emptyAction?: { label: string; onPress: () => void };
};

export function FolderProducts({ query, byLine, emptyAction }: Props) {
  const styles = useStyles();
  const [page, setPage] = useState(1);
  const scroll = useRef<ScrollView>(null);
  const sectionY = useRef<Record<string, number>>({});

  const catalog = useQuery({
    queryKey: ['folder-products', query, page],
    queryFn: () => fetchFolderCatalog({ ...query, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  if (catalog.isPending) return <SkeletonGrid />;
  if (catalog.isError && !catalog.data) {
    return <ErrorState message="Can't load the shop" onRetry={() => catalog.refetch()} />;
  }

  const data = catalog.data;
  if (!data || data.products.length === 0) {
    return <EmptyState message="Nothing here right now." action={emptyAction?.label} onPress={emptyAction?.onPress} />;
  }

  const sections = sectionProducts(data.products, data.facets, byLine);
  const pageCount = Math.max(1, data.pageCount);
  const goTo = (next: number) => {
    sectionY.current = {};
    setPage(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  return (
    <ScrollView ref={scroll} contentContainerStyle={styles.content}>
      {sections.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.anchors}>
          {sections.map((section) => (
            <Chip
              key={section.key}
              label={section.title}
              onPress={() => scroll.current?.scrollTo({ y: sectionY.current[section.key] ?? 0, animated: true })}
            />
          ))}
        </ScrollView>
      ) : null}
      {sections.map((section) => (
        <View
          key={section.key}
          style={styles.section}
          onLayout={(event) => {
            sectionY.current[section.key] = event.nativeEvent.layout.y;
          }}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.grid}>
            {section.products.map((product) => (
              <View key={product.code} style={styles.cell}>
                <ProductCard product={product} />
              </View>
            ))}
            {section.products.length % 2 === 1 ? <View style={styles.cell} /> : null}
          </View>
        </View>
      ))}
      {pageCount > 1 ? (
        <View style={styles.pager}>
          <PagerButton label="Previous" disabled={page <= 1 || catalog.isFetching} onPress={() => goTo(page - 1)} />
          <Text style={styles.pageLabel}>
            Page {page} of {pageCount}
          </Text>
          <PagerButton label="Next" disabled={page >= pageCount || catalog.isFetching} onPress={() => goTo(page + 1)} />
        </View>
      ) : null}
    </ScrollView>
  );
}

function PagerButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.pagerButton, disabled && styles.disabled, pressed && styles.pressed]}>
      <Text style={styles.pagerLabel}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, displayTitle }) => ({
  content: { paddingBottom: 40 },
  anchors: { paddingHorizontal: space.screen, paddingTop: 4, gap: 8 },
  section: { paddingHorizontal: space.screen, paddingTop: 24 },
  sectionTitle: { ...displayTitle, fontSize: 18, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.gap },
  cell: { width: '47.5%', flexGrow: 1 },
  pager: {
    marginTop: 32,
    paddingHorizontal: space.screen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pagerButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagerLabel: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.text },
  pageLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.8 },
}));
