import type { Market } from '@/src/i18n/market';

const configuredRate = Number(process.env.EXPO_PUBLIC_EUR_PER_NAD);

export const EUR_PER_NAD = Number.isFinite(configuredRate) && configuredRate > 0 ? configuredRate : 0.05;

export function nadToEur(nad: number): number {
  return Math.round(nad * EUR_PER_NAD * 100) / 100;
}

export function eurToNad(eur: number): number {
  return Math.round(eur / EUR_PER_NAD);
}

export function formatMoney(amount: number, market: Market = 'na'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (market === 'eu') {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(nadToEur(safeAmount));
  }

  const rounded = Math.round(safeAmount * 100) / 100;
  const whole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
  return `N$${new Intl.NumberFormat('en-NA', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rounded)}`;
}

export function vatOn(net: number, rate = 15): number {
  return Math.round(net * rate) / 100;
}
