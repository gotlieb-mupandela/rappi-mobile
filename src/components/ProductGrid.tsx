import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchCatalog, sizeFacets } from '@/src/api/catalog';
import type { CatalogQuery } from '@/src/api/types';
import { ProductCard } from '@/src/components/ProductCard';
import { Chip, EmptyState, ErrorState, SkeletonBlock, SkeletonGrid } from '@/src/components/ui';
import { colors, fonts, sectionLabel, space } from '@/src/theme';

type Props = {
  query: Omit<CatalogQuery, 'page' | 'pageSize'>;
  emptyMessage: string;
  emptyAction?: { label: string; onPress: () => void };
  showFilters?: boolean;
};

const AUDIENCES = [
  { slug: undefined, label: 'All' },
  { slug: 'men', label: 'Men' },
  { slug: 'women', label: 'Women' },
  { slug: 'kids', label: 'Kids' },
] as const;

export function ProductGrid({ query, emptyMessage, emptyAction, showFilters }: Props) {
  const insets = useSafeAreaInsets();
  const [audience, setAudience] = useState<string | undefined>();
  const [size, setSize] = useState<string | undefined>();
  const [sizeOpen, setSizeOpen] = useState(false);

  const catalog = useInfiniteQuery({
    queryKey: ['catalog', query, audience ?? null, size ?? null],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchCatalog({ ...query, audience: audience ?? query.audience, size, page: pageParam, pageSize: 24 }),
    getNextPageParam: (last) => (last.page < last.pageCount ? last.page + 1 : undefined),
    staleTime: 60_000,
  });

  const products = useMemo(() => {
    const seen = new Set<string>();
    return (catalog.data?.pages.flatMap((page) => page.products) ?? []).filter((product) => {
      if (seen.has(product.code)) return false;
      seen.add(product.code);
      return true;
    });
  }, [catalog.data]);
  const sizes = sizeFacets(catalog.data?.pages[0]?.facets?.sizes ?? []);
  const unfilteredSizes = useRef(sizes);
  if (!size && sizes.length > 0) unfilteredSizes.current = sizes;
  const sizeOptions = size ? unfilteredSizes.current : sizes;
  const cells = products.length % 2 === 1 ? [...products, null] : products;

  const filtered = !!audience || !!size;

  let body: React.ReactNode;
  if (catalog.isPending && !catalog.data) {
    body = <SkeletonGrid />;
  } else if (catalog.isError && !catalog.data) {
    body = <ErrorState message="Can't load the shop" onRetry={() => catalog.refetch()} />;
  } else if (products.length === 0) {
    body = (
      <EmptyState
        message={filtered ? 'No products match these filters.' : emptyMessage}
        action={filtered ? 'Clear filters' : emptyAction?.label}
        onPress={
          filtered
            ? () => {
                setAudience(undefined);
                setSize(undefined);
              }
            : emptyAction?.onPress
        }
      />
    );
  } else {
    body = (
      <FlatList
        data={cells}
        keyExtractor={(item) => item?.code ?? 'filler'}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        onEndReached={() => {
          if (catalog.hasNextPage && !catalog.isFetchingNextPage) {
            void catalog.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.6}
        refreshing={catalog.isRefetching && !catalog.isFetchingNextPage}
        onRefresh={() => catalog.refetch()}
        renderItem={({ item }) => <View style={styles.cell}>{item ? <ProductCard product={item} /> : null}</View>}
        ListFooterComponent={
          catalog.isFetchingNextPage ? (
            <View style={styles.loadingRow}>
              <SkeletonBlock style={styles.loadingCard} />
              <SkeletonBlock style={styles.loadingCard} />
            </View>
          ) : null
        }
      />
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={sectionLabel}>PRODUCTS</Text>
      </View>
      {showFilters ? (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {query.audience
              ? null
              : AUDIENCES.map((item) => (
                  <Chip
                    key={item.label}
                    label={item.label}
                    selected={audience === item.slug}
                    onPress={() => setAudience(item.slug)}
                  />
                ))}
            {sizeOptions.length > 0 || size ? (
              <Chip label={size ? `Size ${size}` : 'Size'} selected={!!size} onPress={() => setSizeOpen((open) => !open)} />
            ) : null}
          </ScrollView>
        </View>
      ) : null}
      {body}
      <Modal visible={sizeOpen} transparent animationType="fade" onRequestClose={() => setSizeOpen(false)}>
        <View style={styles.modal}>
          <Pressable accessibilityLabel="Close size picker" style={StyleSheet.absoluteFill} onPress={() => setSizeOpen(false)} />
          <View style={[styles.sizeSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>CHOOSE SIZE</Text>
            <ScrollView contentContainerStyle={styles.sizeOptions}>
              <Chip
                label="Any size"
                selected={!size}
                onPress={() => {
                  setSize(undefined);
                  setSizeOpen(false);
                }}
              />
              {sizeOptions.map((item) => (
                <Chip
                  key={item.slug}
                  label={item.name}
                  selected={size === item.slug}
                  onPress={() => {
                    setSize(item.slug);
                    setSizeOpen(false);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: space.screen,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chips: { paddingHorizontal: space.screen, gap: 8, paddingBottom: 8 },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.28)' },
  sizeSheet: {
    maxHeight: '65%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: space.screen,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { ...sectionLabel, color: colors.text, marginBottom: 14 },
  sizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  list: { paddingHorizontal: space.screen, paddingBottom: 32, gap: space.gap },
  row: { gap: space.gap },
  cell: { flex: 1 },
  loadingRow: { flexDirection: 'row', gap: space.gap, marginTop: space.gap },
  loadingCard: { flex: 1, aspectRatio: 0.72, borderRadius: 14 },
});
