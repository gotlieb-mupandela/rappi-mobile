import { useQueries } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ALL_FOLDER, fetchFolderCatalog, folderProductQuery, isSearchFolder, isSubFolder } from '@/src/api/catalog';
import { CoverFolderTile, openCatalogFolder } from '@/src/components/FolderBrowser';
import { menuImage, type MenuNode } from '@/src/lib/menus';
import { space } from '@/src/theme';

type Context = {
  /** Category and audience inherited from the screen that shows the tiles. */
  cat: string;
  audience?: string;
  /** Breadcrumb labels of the screens on the stack, ending with the current one. */
  crumbs: string[];
  /** Set when the tiles belong to a website menu, so tiles with fixed children open the next menu level. */
  menu?: { key: string; path: string[] };
};

export function openMenuNode(node: MenuNode, { cat, audience, crumbs, menu }: Context) {
  const nodeCat = node.cat ?? cat;
  const nodeAudience = node.audience ?? audience;
  if (node.children && menu) {
    router.push({ pathname: '/menu/[menu]', params: { menu: menu.key, path: [...menu.path, node.key].join('/') } });
    return;
  }
  const folder = node.folder ?? ALL_FOLDER;
  openCatalogFolder({
    cat: nodeCat,
    folder,
    name: node.name,
    audience: nodeAudience,
    crumbs,
    leaf: isSubFolder(folder) || isSearchFolder(folder),
  });
}

type ProductQuery = ReturnType<typeof folderProductQuery>;

/** Product queries for every catalog folder a tile leads to, through any fixed child tiles. */
function leafQueries(node: MenuNode, cat: string, audience?: string): ProductQuery[] {
  const nodeCat = node.cat ?? cat;
  const nodeAudience = node.audience ?? audience;
  if (node.children) return node.children.flatMap((child) => leafQueries(child, nodeCat, nodeAudience));
  return [folderProductQuery(nodeCat, node.folder, nodeAudience)];
}

export function MenuGrid({ nodes, variant, ...context }: Context & { nodes: MenuNode[]; variant?: 'folder' | 'card' }) {
  const leaves = nodes.map((node) => leafQueries(node, context.cat, context.audience));
  const counts = useQueries({
    queries: leaves.flat().map((query) => ({
      queryKey: ['folder-cover', query],
      queryFn: () => fetchFolderCatalog({ ...query, pageSize: 1 }),
      staleTime: 5 * 60_000,
    })),
  });
  // The website links some folders the store has no products for; hide them rather than open an empty page.
  let offset = 0;
  const visible = nodes.filter((_, index) => {
    const results = counts.slice(offset, offset + leaves[index].length);
    offset += leaves[index].length;
    return !results.every((result) => result.data?.total === 0);
  });

  const cells: (MenuNode | null)[] = visible.length % 2 === 1 ? [...visible, null] : visible;
  const rows: (MenuNode | null)[][] = [];
  for (let index = 0; index < cells.length; index += 2) rows.push(cells.slice(index, index + 2));

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((node, cellIndex) => (
            <View key={node ? `${node.key}-${cellIndex}` : 'filler'} style={styles.cell}>
              {node ? (
                <CoverFolderTile
                  name={node.name}
                  imageUrl={menuImage(node.image)}
                  coverQuery={folderProductQuery(node.cat ?? context.cat, node.folder, node.audience ?? context.audience)}
                  onPress={() => openMenuNode(node, context)}
                  variant={variant}
                />
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: space.gap },
  row: { flexDirection: 'row', gap: space.gap },
  cell: { flex: 1 },
});
