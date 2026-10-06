export type Market = 'na' | 'eu';

export const MARKETS = {
  na: {
    market: 'na',
    language: 'en',
    currency: 'NAD',
    intlLocale: 'en-NA',
    label: 'Namibia · English · N$',
  },
  eu: {
    market: 'eu',
    language: 'fr',
    currency: 'EUR',
    intlLocale: 'fr-FR',
    label: 'France / UE · Français · €',
  },
} as const satisfies Record<Market, {
  market: Market;
  language: 'en' | 'fr';
  currency: 'NAD' | 'EUR';
  intlLocale: 'en-NA' | 'fr-FR';
  label: string;
}>;

export function isMarket(value: unknown): value is Market {
  return value === 'na' || value === 'eu';
}
