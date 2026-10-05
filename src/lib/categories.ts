export const CATEGORY_NAMES: Record<string, string> = {
  sportswear: 'Sportswear',
  shoes: 'Shoes',
  football: 'Football',
  basketball: 'Basketball',
  'running-fitness': 'Running',
  'balls-bags': 'Balls & bags',
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
  'teampro-2026': 'Team Pro',
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

export const HOME_TILES = [
  { slug: 'teampro-2026', label: 'Teams', href: '/teams', span: 'full' as const },
  { slug: 'sportswear', label: 'Sportswear', href: '/category/sportswear', span: 'half' as const },
  { slug: 'football', label: 'Football', href: '/category/football', span: 'half' as const },
  { slug: 'shoes', label: 'Shoes', href: '/category/shoes', span: 'half' as const },
  { slug: 'running-fitness', label: 'Running', href: '/category/running-fitness', span: 'half' as const },
];

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
