import { useQueries, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { fetchFolderCatalog, fetchSiteFolders, folderProductQuery, isSubFolder } from '@/src/api/catalog';
import type { Folder } from '@/src/api/types';
import { FolderProducts } from '@/src/components/FolderProducts';
import { EmptyState, ErrorState, FolderCard, PathTrail, Screen, SkeletonGrid, TypeCard } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { categoryName } from '@/src/lib/categories';
import { space } from '@/src/theme';

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

export function parseCrumbs(raw: string | string[] | undefined): string[] | undefined {
  if (typeof raw !== 'string' || !raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((label): label is string => typeof label === 'string') : undefined;
  } catch {
    return undefined;
  }
}

type OpenFolder = {
  cat: string;
  folder: string;
  name: string;
  audience?: string;
  /** Labels of the screens already on the stack before this folder, one per screen. */
  crumbs?: string[];
  trail?: TrailStep[];
  leaf?: boolean;
};

export function openCatalogFolder({ cat, folder, name, audience, crumbs, trail = [], leaf = false }: OpenFolder) {
  router.push({
    pathname: '/category/[slug]/[group]',
    params: {
      slug: cat,
      group: folder,
      trail: JSON.stringify([...trail, { key: folder, name }]),
      leaf: leaf ? '1' : '0',
      ...(audience ? { audience } : {}),
      ...(crumbs ? { crumbs: JSON.stringify(crumbs) } : {}),
    },
  });
}

type Props = {
  slug: string;
  /** Folders from the category root down to and including the current one. */
  trail: TrailStep[];
  /** True when the parent already said this folder has no children. */
  leaf: boolean;
  audience?: string;
  /** Breadcrumb labels for the screens before `trail`; defaults to the category name. */
  crumbs?: string[];
};

export function FolderBrowser({ slug, trail, leaf, audience, crumbs }: Props) {
  const { folderName, market } = useLocale();
  const language = market === 'eu' ? 'fr' : 'en';
  const current = trail[trail.length - 1];
  const title = current ? folderName(current.key, current.name) : categoryName(slug, language);
  const rootCrumbs = crumbs ?? [categoryName(slug, language)];

  const folders = useQuery({
    queryKey: ['site-folders', slug, current?.key ?? null, audience ?? null],
    queryFn: () => fetchSiteFolders(slug, current?.key, audience),
    enabled: !leaf,
    staleTime: 60_000,
  });
  const coverQuery = (folder: Folder) => folderProductQuery(folder.cat ?? slug, folder.key, audience);
  // Folder counts ignore the audience, so for Men / Women / Kids hide folders with nothing for that audience.
  const audienceCounts = useQueries({
    queries: (audience ? (folders.data ?? []) : []).map((folder) => {
      const query = coverQuery(folder);
      return {
        queryKey: ['folder-cover', query],
        queryFn: () => fetchFolderCatalog({ ...query, pageSize: 1 }),
        staleTime: 5 * 60_000,
      };
    }),
  });
  const visibleFolders = folders.data?.filter((_, index) => !audience || audienceCounts[index]?.data?.total !== 0);

  const labels = [...rootCrumbs, ...trail.map((step) => folderName(step.key, step.name))];
  const parts = labels.map((label, index) => {
    const pops = labels.length - 1 - index;
    return {
      label,
      onPress: pops > 0 ? () => (router.canDismiss() ? router.dismiss(pops) : router.back()) : undefined,
    };
  });

  const openFolder = (folder: Folder) =>
    openCatalogFolder({
      cat: folder.cat ?? slug,
      folder: folder.key,
      name: folderName(folder.key, folder.name),
      audience,
      crumbs,
      trail,
      leaf: false,
    });

  const back = { label: 'Back', onPress: () => router.back() };
  const productQuery = folderProductQuery(slug, current?.key, audience);
  const showProducts = leaf || (folders.data && folders.data.length === 0);
  const cells: (Folder | null)[] = visibleFolders
    ? visibleFolders.length % 2 === 1
      ? [...visibleFolders, null]
      : visibleFolders
    : [];

  return (
    <Screen title={title} back>
      <PathTrail parts={parts} />
      {showProducts ? (
        <FolderProducts
          query={productQuery}
          byLine={!!current && isSubFolder(current.key)}
          emptyAction={back}
        />
      ) : folders.isPending ? (
        <SkeletonGrid />
      ) : folders.isError && !folders.data ? (
        <ErrorState message="Can't load the shop" onRetry={() => folders.refetch()} />
      ) : folders.data ? (
        <FlatList
          data={cells}
          keyExtractor={(item) => item?.key ?? 'filler'}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshing={folders.isRefetching}
          onRefresh={() => folders.refetch()}
          renderItem={({ item }) => (
            <View style={styles.cell}>
              {item ? (
                <CoverFolderTile
                  name={folderName(item.key, item.name)}
                  imageUrl={item.imageUrl}
                  coverQuery={coverQuery(item)}
                  onPress={() => openFolder(item)}
                />
              ) : null}
            </View>
          )}
          ListEmptyComponent={<EmptyState message="Nothing here right now." action="Back" onPress={() => router.back()} />}
        />
      ) : null}
    </Screen>
  );
}

/** Website folder tile: uses the given picture, otherwise the first product in the folder. */
export function CoverFolderTile({
  name,
  imageUrl,
  coverQuery,
  onPress,
  variant = 'folder',
}: {
  name: string;
  imageUrl?: string;
  coverQuery: ReturnType<typeof folderProductQuery>;
  onPress: () => void;
  variant?: 'folder' | 'card';
}) {
  const cover = useQuery({
    queryKey: ['folder-cover', coverQuery],
    queryFn: () => fetchFolderCatalog({ ...coverQuery, pageSize: 1 }),
    enabled: !imageUrl,
    staleTime: 5 * 60_000,
  });
  const image = imageUrl || cover.data?.products[0]?.imageUrl;
  if (variant === 'card') return <TypeCard name={name} imageUrl={image} onPress={onPress} />;
  return <FolderCard name={name} imageUrl={image} onPress={onPress} />;
}

const styles = StyleSheet.create({
  list: { padding: space.screen, gap: space.gap },
  row: { gap: space.gap },
  cell: { flex: 1 },
});
