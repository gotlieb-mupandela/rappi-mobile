export const CATEGORY_NAMES: Record<string, string> = {
  sportswear: 'Sportswear',
  shoes: 'Footwear',
  football: 'Football',
  basketball: 'Basketball',
  'running-fitness': 'Running & Fitness',
  'balls-bags': 'Balls & Bags',
  swimming: 'Swimming',
  rugby: 'Rugby',
  cricket: 'Cricket',
  boxing: 'Boxing',
  hockey: 'Hockey',
  brama: 'Brama',
  padel: 'Padel',
  hiking: 'Hiking',
  resort: 'Resort',
  lifestyle: 'Lifestyle',
  'teampro-2026': 'Teampro 2026',
};

export const PRIMARY_CATEGORY_ORDER = [
  'sportswear',
  'shoes',
  'football',
  'basketball',
  'running-fitness',
  'balls-bags',
  'swimming',
] as const;

const SITE = 'https://www.rappisportshub.com';
const jomaImage = (file: string, width: number) =>
  `https://wsrv.nl/?url=${encodeURIComponent(`https://www.joma-sport.com/on/demandware.static/-/Sites-joma-masterCatalog/default/images/medium/${file}`)}&w=${width}&output=webp&q=75`;

type HomeTile = {
  key: string;
  label: string;
  href: string;
  image: string;
  span: 'full' | 'half';
  tone?: 'light';
};

export const HOME_TILES: HomeTile[] = [
  { key: 'teamwear', label: 'Teamwear', href: '/menu/teamwear', image: `${SITE}/_next/image?url=%2Fbrand%2Fhub-teampro-2026.webp&w=1080&q=75`, span: 'full' },
  { key: 'sportswear', label: 'Sportswear', href: '/category/sportswear', image: `${SITE}/_next/image?url=%2Fbrand%2Fhub-sportswear.png%3Fv%3D5&w=828&q=75`, span: 'half' },
  { key: 'running', label: 'Running', href: '/category/running-fitness', image: jomaImage('104129.100_1.jpg', 828), span: 'half' },
  { key: 'lifestyle', label: 'Lifestyle', href: '/category/lifestyle', image: jomaImage('100818.200_1.jpg', 828), span: 'half' },
  { key: 'footwear', label: 'Footwear', href: '/category/shoes', image: `${SITE}/_next/image?url=%2Fbrand%2Fhub-shoes.png&w=828&q=75`, span: 'half' },
  { key: 'kids', label: 'Kids', href: '/menu/kids', image: jomaImage('500747.475_1.jpg', 1080), span: 'full', tone: 'light' },
];

/** Banner photo for a category hub: the picture of the Home tile that opens it. */
export function hubImage(slug: string): string | undefined {
  return HOME_TILES.find((tile) => tile.href === `/category/${slug}`)?.image;
}

export function categoryName(slug: string): string {
  if (CATEGORY_NAMES[slug]) return CATEGORY_NAMES[slug];
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function isHiddenCategory(slug: string): boolean {
  return slug === 'netball';
}
