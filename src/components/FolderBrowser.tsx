import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { fetchCatalog, fetchFolders, folderProductQuery } from '@/src/api/catalog';
import type { Folder } from '@/src/api/types';
import { ProductGrid } from '@/src/components/ProductGrid';
import { EmptyState, ErrorState, FolderCard, PathTrail, Screen, SkeletonGrid } from '@/src/components/ui';
import { categoryName } from '@/src/lib/categories';
import { sectionLabel, space } from '@/src/theme';

export type TrailStep = { key: string; name: string };

export function parseTrail(raw: string | string[] | undefined): TrailStep[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw) as TrailStep[];
    return Array.isArray(parsed) ? parsed.filter((step) => step && typeof step.key === 'string') : [];
  } catch {
    return [];
  }
}

type Props = {
  slug: string;
  /** Folders from the category root down to and including the current one. Empty on the category screen. */
  trail: TrailStep[];
  /** True when the parent already said this folder has no children. */
  leaf: boolean;
};

export function FolderBrowser({ slug, trail, leaf }: Props) {
  const current = trail[trail.length - 1];
  const title = current?.name ?? categoryName(slug);

  const folders = useQuery({
    queryKey: ['folders', slug, current?.key ?? null],
    queryFn: () => fetchFolders(slug, current?.key),
    enabled: !leaf,
    staleTime: 60_000,
  });

  const labels = [categoryName(slug), ...trail.map((step) => step.name)];
  const parts = labels.map((label, index) => {
    const pops = labels.length - 1 - index;
    return {
      label,
      onPress: pops > 0 ? () => (router.canDismiss() ? router.dismiss(pops) : router.back()) : undefined,
    };
  });

  const openFolder = (folder: Folder) => {
    router.push({
      pathname: '/category/[slug]/[group]',
      params: {
        slug,
        group: folder.key,
        trail: JSON.stringify([...trail, { key: folder.key, name: folder.name }]),
        leaf: folder.hasChildren ? '0' : '1',
      },
    });
  };

  const back = { label: 'Back', onPress: () => router.back() };
  const productQuery = folderProductQuery(slug, current?.key);
  const showProducts = leaf || (folders.data && folders.data.length === 0);
  const cells: (Folder | null)[] = folders.data
    ? folders.data.length % 2 === 1
      ? [...folders.data, null]
      : folders.data
    : [];

  return (
    <Screen title={title} back>
      <PathTrail parts={parts} />
      {showProducts ? (
        <ProductGrid query={productQuery} emptyMessage="Nothing here right now." emptyAction={back} showFilters />
      ) : folders.isPending ? (
        <SkeletonGrid />
      ) : folders.isError && !folders.data ? (
        <ErrorState message="Can't load the shop" onRetry={() => folders.refetch()} />
      ) : folders.data ? (
        <View style={styles.flex}>
          <Text style={[sectionLabel, styles.label]}>FOLDERS</Text>
          <FlatList
            data={cells}
            keyExtractor={(item) => item?.key ?? 'filler'}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.list}
            refreshing={folders.isRefetching}
            onRefresh={() => folders.refetch()}
            renderItem={({ item }) => (
              <View style={styles.cell}>{item ? <FolderTile slug={slug} folder={item} onPress={() => openFolder(item)} /> : null}</View>
            )}
            ListEmptyComponent={<EmptyState message="Nothing here right now." action="Back" onPress={() => router.back()} />}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function FolderTile({ slug, folder, onPress }: { slug: string; folder: Folder; onPress: () => void }) {
  const cover = useQuery({
    queryKey: ['folder-cover', slug, folder.key],
    queryFn: () => fetchCatalog({ ...folderProductQuery(slug, folder.key), pageSize: 1 }),
    enabled: !folder.imageUrl,
    staleTime: 5 * 60_000,
  });
  const imageUrl = folder.imageUrl || cover.data?.products[0]?.imageUrl;
  return <FolderCard folder={imageUrl ? { ...folder, imageUrl } : folder} onPress={onPress} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  label: { paddingHorizontal: space.screen, paddingTop: 12 },
  list: { padding: space.screen, gap: space.gap },
  row: { gap: space.gap },
  cell: { flex: 1 },
});
