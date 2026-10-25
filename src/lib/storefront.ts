/**
 * Picture and folder overlays from GET /api/mobile/storefront.
 * Applied only when website parity is on, so the shipped menus stay unchanged.
 */

export type StorefrontMenus = Record<string, { image?: string; tiles?: Record<string, string> }>;

/**
 * App tile key → storefront tile key, when the website uses a different id
 * for the same picture.
 */
const TILE_IMAGE_ALIAS: Record<string, Record<string, string>> = {
  men: { 'fitness-gym': 'jp-916ee19d09' },
  women: {
    'teamwear-pro-2026': 'w-teamwear-pro-2026',
    cycling: 'w-cycling',
    'fitness-gym-woman': 'jp-772af1d537',
    'hiking-outdoor': 'w-hiking-outdoor',
    'aguila-line': 'w-aguila-line',
    resort: 'w-resort',
    beachwear: 'w-beachwear',
    'athletes-combat': 'w-athletes-combat',
    'elite-club': 'w-elite-club',
  },
  kits: { 'kits-replicas': 'jp-9ec1469982' },
  outlet: { 'outlet-apparel-byear': 'jp-8dd93a2ea5' },
};

export type FolderPatch = { folder: string; name: string };

/** Men's Fitness / Gym folder is empty in the catalog; the website tile is Indoor. */
export function parityFolderPatch(menuKey: string, nodeKey: string): FolderPatch | undefined {
  if (menuKey === 'men' && nodeKey === 'fitness-gym') {
    return { folder: 'jp-916ee19d09', name: 'Indoor' };
  }
  return undefined;
}

export function storefrontTileUrl(
  menus: StorefrontMenus | undefined,
  menuKey: string,
  nodeKey: string,
): string | undefined {
  const tiles = menus?.[menuKey]?.tiles;
  if (!tiles) return undefined;
  if (tiles[nodeKey]) return tiles[nodeKey];
  const alias = TILE_IMAGE_ALIAS[menuKey]?.[nodeKey];
  return alias ? tiles[alias] : undefined;
}

type TileNode = { key: string; name: string; image?: string; folder?: string };

export function withStorefrontNode<T extends TileNode>(
  menuKey: string | undefined,
  node: T,
  menus: StorefrontMenus | undefined,
  parity: boolean,
): T {
  if (!parity || !menuKey) return node;
  const patch = parityFolderPatch(menuKey, node.key);
  const image = storefrontTileUrl(menus, menuKey, node.key);
  if (!patch && !image) return node;
  return { ...node, ...patch, ...(image ? { image } : {}) };
}
