import { ALL_FOLDER, searchFolderKey, subFolderKey } from '@/src/api/catalog';
import { sizedImage } from '@/src/lib/images';

const SITE = 'https://www.rappisportshub.com';
const JOMA = 'https://www.joma-sport.com/on/demandware.static/-/Sites-joma-masterCatalog/default/images/medium/';
const JOMA_V1 = 'https://v1.joma-sport.net/files/0001/h1bk2b91212b127y123ydhe783737371/web.system/products/';

/** `J:` and `V:` are Joma image files, `/brand/...` are website assets. Same sources the website tiles use. */
export function menuImage(ref: string | undefined, width = 640): string | undefined {
  if (!ref) return undefined;
  if (ref.startsWith('http')) return ref;
  if (ref.startsWith('/')) return `${SITE}/_next/image?url=${encodeURIComponent(ref)}&w=${width}&q=75`;
  const source = ref.startsWith('J:') ? JOMA + ref.slice(2) : ref.startsWith('V:') ? JOMA_V1 + ref.slice(2) : ref;
  return sizedImage(source, width);
}

export type MenuNode = {
  key: string;
  name: string;
  image?: string;
  /** Catalog category for folders and products; inherited from the parent when missing. */
  cat?: string;
  /** Catalog audience filter; inherited from the parent when missing. */
  audience?: string;
  /** Folder key opened from this tile: a group, `sub:<slug>`, `q:<text>`, or the whole category. */
  folder?: string;
  /** Fixed child tiles the website shows before the catalog folders take over. */
  children?: MenuNode[];
};

export type Menu = {
  key: string;
  name: string;
  /** Page heading on the website, e.g. the "Man" menu item opens "Man". */
  title: string;
  image: string;
  cat: string;
  audience?: string;
  nodes: MenuNode[];
};

function tile(name: string, image: string | undefined, folder: string, extra: Partial<MenuNode> = {}): MenuNode {
  return { key: extra.key ?? folder, name, image, folder, ...extra };
}

const sub = (slug: string) => subFolderKey(slug);
const search = (text: string) => searchFolderKey(text);

/** Website "Shop by type" for the Sportswear hub. */
export const SPORTSWEAR_TYPES: MenuNode[] = [
  tile('Teamwear', 'V:20251114130551.104594.102.jpg', 'teamwear'),
  tile('Teamwear Pro 2026', 'J:100050.100_1.jpg', 'teamwear-pro-2026'),
  tile('Running / Trail', 'J:102223.013_1.jpg', 'running-trail'),
  tile('Cycling', 'V:20260114163243.103456.112.jpg', 'cycling'),
  tile('Racket sports', 'J:101739E8200B_1.jpg', 'racket-sports'),
  tile('Hiking / Outdoor', 'J:103040.007_1.jpg', 'hiking-outdoor'),
  tile('Fitness / Gym', 'J:102968.008_1.jpg', 'fitness-gym'),
  tile('Lifestyle', 'J:100818.200_1.jpg', 'lifestyle-apparel'),
  tile('Águila Line', 'V:20260320115007.105682.278.jpg', 'aguila-line'),
  tile('Resort', 'J:104657.100_1.jpg', 'resort'),
  tile('Beachwear', 'V:20260320123623.105382.585.jpg', 'beachwear'),
  tile('Underwear / Brama', 'J:101015.100_1.jpg', 'underwear-brama'),
  tile('Athletes / Combat', 'J:104409.200_1.jpg', 'athletes-combat'),
  tile('Elite club', 'V:20260128151840.104798.200.jpg', 'elite-club'),
];

/** Website "Shop by type" for the Footwear hub, also shown under Footwear → Men / Women / Kids. */
export const SHOE_TYPES: MenuNode[] = [
  tile('Special Editions', 'J:DRIS2601IN_1.jpg', 'special-editions'),
  tile('Football', 'J:ACUS2401FG_1.jpg', 'football-surfaces'),
  tile('Futsal', 'J:DRIS2602IN_1.jpg', sub('futsal')),
  tile('Turf', 'V:20250318131302.AGUW2501TF.jpg', sub('turf')),
  tile('Running', 'V:20251113162952.RACTIW2602.jpg', sub('running-shoes')),
  tile('Trail Running', 'V:20251008120222.TKKUBW2615.jpg', sub('trail-running')),
  tile('Tennis', 'J:TACELS2602AC_1.jpg', sub('tennis-shoes')),
  tile('Pádel', 'J:TSLAMS2601OM_1.jpg', sub('padel-shoes')),
  tile('Pickleball', 'J:PSTROLS2602C_1.jpg', sub('pickleball-shoes')),
  tile('Handball', 'V:20260407092837.104913.102.jpg', sub('handball-shoes')),
  tile('Badminton', undefined, sub('badminton-shoes')),
  tile('Basketball', 'J:101660.100_1.jpg', sub('basketball-shoes')),
  tile('Outdoor', 'V:20251120111033.CTERW2628.jpg', sub('outdoor-shoes')),
  tile('Hockey', 'V:20251120111033.HPULW2602.jpg', sub('hockey-shoes')),
  tile('Training', 'J:CRTHUW2602_1.jpg', sub('training-shoes')),
  tile('Volleyball', 'J:VBLOKS2502_1.jpg', sub('volleyball-shoes')),
  tile('Confort', 'J:C500LW2302V_1.jpg', sub('comfort-shoes')),
  tile('Joma flow', 'V:20260805125923.CJFZENS2723.jpg', sub('joma-flow')),
  tile('Sandals confort', 'J:SCOSTS2503_1.jpg', sub('sandals')),
  tile('Sneakers', 'V:20251022153450.C1448LW2613.jpg', sub('sneakers')),
  tile('Barefoot', 'J:BF1448W2503_1.jpg', sub('barefoot')),
  tile('Summer shoes', 'V:20250513152433.SAFTES2603.jpg', sub('summer-shoes')),
  tile('Forloz', undefined, sub('forloz')),
  tile('Previous seasons', 'V:20250318131302.AGUW2501TF.jpg', 'previous-seasons-shoes'),
  tile('Outlet', 'J:FSS2402IN_1.jpg', 'footwear-outlet'),
];

/** Fixed "Shop by type" tiles for hubs whose website page does not use the catalog folders. */
export const HUB_TYPES: Record<string, MenuNode[]> = {
  sportswear: SPORTSWEAR_TYPES,
  shoes: SHOE_TYPES,
};

export const HUB_DESCRIPTIONS: Record<string, string> = {
  sportswear: 'Tees, shorts, tracksuits, hoodies, jackets, and training layers.',
};

export const AUDIENCE_IMAGES: Record<string, string> = {
  men: '/brand/audience-men.png?v=3',
  women: '/brand/audience-women.png?v=4',
};

const kidsGroup = (name: string, image: string, key: string, children: [string, string][]): MenuNode => ({
  key,
  name,
  image,
  children: children.map(([childName, folder]) => tile(childName, undefined, folder)),
});

export const MENUS: Menu[] = [
  {
    key: 'men',
    name: 'Man',
    title: 'Man',
    image: 'V:20251114130551.104594.102.jpg',
    cat: 'sportswear',
    audience: 'men',
    nodes: [
      tile('Teamwear', 'V:20251114130551.104594.102.jpg', 'teamwear'),
      tile('Teamwear Pro 2026', '/brand/hub-teampro-2026.webp', 'teamwear-pro-2026'),
      tile('Running / Trailrunning', '/brand/hero-athlete.png?v=2', 'running-trail'),
      tile('Cycling', 'V:20260114163243.103456.112.jpg', 'cycling'),
      tile('Racket Sports', 'J:SW10601D0101_1.jpg', 'racket-sports'),
      tile('Hiking / Outdoor', 'J:104477.004_1.jpg', 'hiking-outdoor'),
      tile('Fitness / Gym', 'J:102968.008_1.jpg', 'fitness-gym'),
      tile('Lifestyle', 'J:100818.200_1.jpg', 'lifestyle-apparel'),
      tile('Águila Line', 'V:20260320115007.105681.003.jpg', 'aguila-line'),
      tile('Resort', 'J:104657.100_1.jpg', 'resort'),
      tile('Beachwear', 'V:20260320123623.105382.585.jpg', 'beachwear'),
      tile('Underwear / Brama', 'J:101015.200_1.jpg', 'underwear-brama'),
      tile('Athletes / Combat', 'J:104413.200_1.jpg', 'athletes-combat'),
      tile('Elite club', 'V:20260128151840.104798.200.jpg', 'elite-club'),
    ],
  },
  {
    key: 'women',
    name: 'Woman',
    title: 'Woman',
    image: '/brand/audience-women.png?v=4',
    cat: 'sportswear',
    audience: 'women',
    nodes: [
      tile('Teamwear', '/brand/audience-women-teamwear.png?v=2', 'teamwear-woman'),
      tile('Teamwear Pro 2026', '/brand/audience-women-jersey-navy.png?v=2', 'teamwear-pro-2026'),
      tile('Running / Trailrunning', '/brand/audience-women-field.png?v=2', 'running-trail-woman'),
      tile('Cycling', 'V:20260528110037.105427.100.jpg', 'cycling'),
      tile('Racket Sports', 'J:SW10601D0101_1.jpg', 'racket-sports-woman'),
      tile('Fitness / Gym', 'J:102968.008_1.jpg', 'fitness-gym-woman'),
      tile('Hiking / Outdoor', 'J:104477.004_1.jpg', 'hiking-outdoor'),
      tile('Lifestyle', '/brand/audience-women-lifestyle.png?v=2', 'lifestyle-apparel-woman'),
      tile('Águila Line', 'V:20260320115007.105681.576.jpg', 'aguila-line'),
      tile('Resort', 'J:902748.649_1.jpg', 'resort'),
      tile('Beachwear', 'V:20260528183436.903276.740.jpg', 'beachwear'),
      tile('Underwear / Brama', 'J:101015.200_1.jpg', 'underwear-brama-woman'),
      tile('Athletes / Combat', 'J:104413.200_1.jpg', 'athletes-combat'),
      tile('Elite club', 'V:20260128151840.104798.200.jpg', 'elite-club'),
    ],
  },
  {
    key: 'kids',
    name: 'Children',
    title: 'Children',
    image: 'J:500747.475_1.jpg',
    cat: 'sportswear',
    audience: 'kids',
    nodes: [
      kidsGroup('1 - 4 years', 'J:600157.600_1.jpg', 'kids-1-4', [
        ['Teamwear', 'k14-teamwear'],
        ['Outerwear', 'k14-outerwear'],
        ['T-shirts & polos', 'k14-tshirts-polos'],
        ['Tracksuit & set', 'k14-tracksuit-set'],
        ['Sweatshirts & Jackets', 'k14-sweatshirts-jackets'],
        ['Pants', 'k14-pants'],
        ['Brama', 'k14-brama'],
        ['Accessories', 'k14-accessories'],
      ]),
      kidsGroup('6 - 10 years', 'V:20260410144242.500948.200.jpg', 'kids-6-10', [
        ['Teamwear', 'k610-teamwear'],
        ['Outerwear', 'k610-outerwear'],
        ['T-Shirts & Polos', 'k610-tshirts-polos'],
        ['Jackets & Sweatshirts', 'k610-jackets-sweatshirts'],
        ['Set', 'k610-set'],
        ['Tracksuits', 'k610-tracksuits'],
        ['Brama', 'k610-brama'],
        ['Pants & Tights', 'k610-pants-tights'],
        ['Beachwear', 'k610-beachwear'],
        ['Accessories', 'k610-accessories'],
        ['Previous seasons', 'k610-previous-seasons'],
      ]),
      kidsGroup('12 - 14 years Boy', 'V:20260528130000.500947.003.jpg', 'kids-12-14-boy', [
        ['Teamwear', 'k1214b-teamwear'],
        ['Racket sports', 'k1214b-racket'],
        ['Outerwear', 'k1214b-outerwear'],
        ['Beachwear', 'k1214b-beachwear'],
        ['T-shirts & Polos', 'k1214b-tshirts-polos'],
        ['Jackets & Sweatshirts', 'k1214b-jackets-sweatshirts'],
        ['Tracksuits', 'k1214b-tracksuits'],
        ['Pants', 'k1214b-pants'],
        ['Outlet', 'k1214b-outlet'],
        ['Brama', 'k1214b-brama'],
        ['Accessories', 'k1214b-accessories'],
        ['Outlet', 'k1214b-outlet-2'],
      ]),
      kidsGroup('12 - 14 years Girl', 'V:20260410144242.500951.594.jpg', 'kids-12-14-girl', [
        ['Teamwear', 'k1214g-teamwear'],
        ['Racket sports', 'k1214g-racket'],
        ['Outerwear', 'k1214g-outerwear'],
        ['Beachwear', 'k1214g-beachwear'],
        ['T-shirts & Polos', 'k1214g-tshirts-polos'],
        ['Jackets & Sweatshirts', 'k1214g-jackets-sweatshirts'],
        ['Tracksuit & Set', 'k1214g-tracksuit-set'],
        ['Pants & Tights', 'k1214g-pants-tights'],
        ['Skirts & Dresses', 'k1214g-skirts-dresses'],
        ['Underwear & Brama', 'k1214g-underwear-brama'],
        ['Accessories', 'k1214g-accessories'],
      ]),
      // The store files most kids products by type rather than the website's age folders.
      tile('Jackets', undefined, sub('jackets')),
      tile('Hoodies', undefined, sub('hoodies')),
      tile('T-Shirts', undefined, sub('tees-kids')),
      tile('Polos', undefined, sub('polos')),
      tile('Tracksuits', undefined, sub('tracksuits')),
      tile('Pants', undefined, sub('pants')),
      tile('Leggings', undefined, sub('leggings')),
      tile('Dresses', undefined, sub('dresses')),
      tile('Rackets', undefined, sub('rackets')),
    ],
  },
  {
    key: 'shoes',
    name: 'Footwear',
    title: 'Footwear',
    image: 'J:BF1448W2503_1.jpg',
    cat: 'shoes',
    nodes: [
      { key: 'men', name: 'Men', image: 'J:BF1448W2503_1.jpg', audience: 'men', children: SHOE_TYPES },
      { key: 'women', name: 'Women', image: 'V:20251022153450.C1448LW2613.jpg', audience: 'women', children: SHOE_TYPES },
      { key: 'kids', name: 'Kids', image: 'J:BFBHORW2603V_1.jpg', audience: 'kids', children: SHOE_TYPES },
      tile('Outlet', 'J:FSS2402IN_1.jpg', 'footwear-outlet'),
    ],
  },
  {
    key: 'kits',
    name: 'Official Kits',
    title: 'Official Kits',
    image: '/brand/hub-teampro-2026.webp',
    cat: 'sportswear',
    nodes: [
      tile('Sponsor Replicas', '/brand/hub-teampro-2026.webp', 'kits-replicas'),
      tile('Committees and Federations', 'J:AH10601B0101_1.jpg', 'kits-federations'),
      tile('Special Editions', 'V:20260525100956.RECS2776IN.jpg', 'kits-special'),
    ],
  },
  {
    key: 'accessories',
    name: 'Accessories',
    title: 'Accessories',
    image: 'J:400356.308_1.jpg',
    cat: 'balls-bags',
    nodes: [
      tile('Balls', 'J:400356.308_1.jpg', 'acc-balls'),
      tile('Gloves portero', 'J:400422.501_1.jpg', 'acc-gloves-portero', { cat: 'football' }),
      tile('Backpacks', 'V:20250723165128.400001.450.jpg', 'acc-backpacks'),
      tile('Medias', 'V:20230413110255.400022.100.jpg', 'acc-medias'),
      tile('Socks', 'J:400289.702_1.jpg', 'acc-socks', { cat: 'sportswear' }),
      tile('Accessories teamwear', 'J:400024.100_1.jpg', 'acc-teamwear', { cat: 'sportswear' }),
      tile('Accessories running', 'J:101689.050_1.jpg', 'acc-running', { cat: 'running-fitness' }),
      tile('Accessories of Racket', 'V:20260807100940.401845.100.jpg', 'acc-racket', { cat: 'sportswear' }),
      tile('Palas of pádel', 'J:401909.111_1.jpg', 'acc-palas-padel', { cat: 'padel' }),
      tile('Palas of Pickleball', 'V:20260526120743.402062.314.jpg', 'acc-palas-pickleball'),
      tile('Accessories Outdoor', 'V:20260622153309.401970.477.jpg', 'acc-outdoor', { cat: 'hiking' }),
      tile('Accessories Fitness / Gym', 'J:101686.010_1.jpg', 'acc-fitness-gym', { cat: 'running-fitness' }),
      tile('Accessories tiendas', 'V:20140616155008.JOM-019.jpg', 'acc-tiendas'),
      tile('Teamwear Catalogue', 'J:104302.485_1.jpg', 'acc-teamwear-catalogue', { cat: 'teampro-2026' }),
    ],
  },
  {
    key: 'outlet',
    name: 'Outlet',
    title: 'Outlet',
    image: 'J:101588.100_1.jpg',
    cat: 'sportswear',
    nodes: [
      tile('Promotions', 'J:101588.100_1.jpg', 'outlet-promotions'),
      tile('Footwear', 'J:FSS2402IN_1.jpg', 'outlet-footwear', { cat: 'shoes' }),
      tile('Apparel of byear', undefined, 'outlet-apparel-byear'),
      tile('Sweatshirt / Jacket', 'J:101589.100_1.jpg', 'outlet-sweatshirt-jacket'),
      tile('T-shirt / Top', 'J:101588.200_1.jpg', 'outlet-tshirt-top'),
      tile('Pants / Shorts', 'J:102841.100_1.jpg', 'outlet-pants-shorts'),
      tile('Anorak', 'J:500764.100_1.jpg', 'outlet-anorak'),
      tile('Tracksuit', undefined, 'outlet-tracksuit'),
      tile('Junior', 'J:500804.435_1.jpg', 'outlet-junior'),
      tile('1.99 - 2.99', 'J:900935.027_1.jpg', 'outlet-price-199-299'),
      tile('2.99 - 3.99', undefined, 'outlet-price-299-399'),
      tile('3.99 - 4.99', 'J:101291.452_1.jpg', 'outlet-price-399-499'),
      tile('4.99 - 5.99', 'J:901267.601_1.jpg', 'outlet-price-499-599'),
      tile('5.99 - 6.99', 'J:102219.336_1.jpg', 'outlet-price-599-699'),
      tile('6.99 - 7.99', 'J:102752.100_1.jpg', 'outlet-price-699-799'),
      tile('7.99 - 10.99', 'J:103908.991_1.jpg', 'outlet-price-799-1099'),
      tile('10.99 - 15.99', 'J:600115.426_1.jpg', 'outlet-price-1099-1599'),
      tile('From 15.99', undefined, 'outlet-price-from-1599'),
    ],
  },
  {
    key: 'teamwear',
    name: 'Teams',
    title: 'Teams',
    image: '/brand/hub-teampro-2026.webp',
    cat: 'sportswear',
    nodes: [
      tile('Polyester', 'J:5001.13.35_1.jpg', search('polyester'), { key: 'polyester' }),
      tile('Cotton', 'J:100912.200_1.jpg', search('cotton'), { key: 'cotton' }),
      tile('Outerwear', 'J:100086.671_1.jpg', 'jackets'),
      tile('Soccer / Futsal', 'V:20251114130551.104594.102.jpg', ALL_FOLDER, { key: 'football', cat: 'football' }),
      tile('Basketball', 'J:101660.100_1.jpg', ALL_FOLDER, { key: 'basketball', cat: 'basketball' }),
      tile('Rugby', 'J:102219.602_1.jpg', ALL_FOLDER, { key: 'rugby', cat: 'rugby' }),
      tile('Volleyball', 'V:20260407130312.105374.013.jpg', search('volley'), { key: 'volleyball', cat: 'running-fitness' }),
      tile('Handball', 'J:103837.251_1.jpg', search('handball'), { key: 'handball' }),
      tile('Coach', 'J:TI10201B1221_1.jpg', search('staff'), { key: 'coach' }),
      tile('Referee', 'J:104240.061_1.jpg', search('referee'), { key: 'referee' }),
      tile('Goalie', 'J:102858.013_1.jpg', search('goalkeeper'), { key: 'goalie', cat: 'football' }),
      tile('Cricket', 'J:104443.001_1.jpg', ALL_FOLDER, { key: 'cricket', cat: 'cricket' }),
      tile('Swimming', 'J:104143.345_1.jpg', ALL_FOLDER, { key: 'swimming', cat: 'swimming' }),
      tile('Pants', 'J:100165.100_1.jpg', 'pants'),
    ],
  },
];

/** Order of the website's top navigation. */
export const NAV_MENU_KEYS = ['men', 'women', 'kids', 'shoes', 'kits', 'accessories', 'outlet'] as const;

export function findMenu(key: string | undefined): Menu | undefined {
  return MENUS.find((menu) => menu.key === key);
}

export type ResolvedNode = { node: MenuNode; cat: string; audience?: string };

/** Walks `path` (node keys) from the menu root, carrying category and audience down like the website links do. */
export function resolveMenuPath(menu: Menu, path: string[]): { trail: ResolvedNode[]; nodes: MenuNode[] } | null {
  const trail: ResolvedNode[] = [];
  let nodes = menu.nodes;
  let cat = menu.cat;
  let audience = menu.audience;
  for (const key of path) {
    const node = nodes.find((item) => item.key === key);
    if (!node?.children) return null;
    cat = node.cat ?? cat;
    audience = node.audience ?? audience;
    trail.push({ node, cat, audience });
    nodes = node.children;
  }
  return { trail, nodes };
}

export function parseMenuPath(raw: string | string[] | undefined): string[] {
  return typeof raw === 'string' && raw ? raw.split('/').filter(Boolean) : [];
}
