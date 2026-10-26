import type { ShippingMethod } from '@/src/api/types';
import { localized } from './adapt.ts';
import type { StorefrontCheckout, StorefrontLanguage } from './types.ts';

/**
 * ISO codes for the country names checkout already sends to the payment API.
 * Unknown codes from the feed are dropped so the payment country string stays one of these names.
 */
export const CHECKOUT_COUNTRY_NAMES: Readonly<Record<string, string>> = {
  NA: 'Namibia',
  ZA: 'South Africa',
  BW: 'Botswana',
  FR: 'France',
  BE: 'Belgium',
  LU: 'Luxembourg',
  DE: 'Germany',
  NL: 'Netherlands',
  ES: 'Spain',
  IT: 'Italy',
  PT: 'Portugal',
  AT: 'Austria',
  IE: 'Ireland',
  FI: 'Finland',
  SE: 'Sweden',
  DK: 'Denmark',
  GR: 'Greece',
  PL: 'Poland',
  CZ: 'Czechia',
  SK: 'Slovakia',
  SI: 'Slovenia',
  HR: 'Croatia',
  HU: 'Hungary',
  RO: 'Romania',
  BG: 'Bulgaria',
  EE: 'Estonia',
  LV: 'Latvia',
  LT: 'Lithuania',
  MT: 'Malta',
  CY: 'Cyprus',
  GB: 'United Kingdom',
  CH: 'Switzerland',
};

const SHIPPING_METHODS = new Set<string>(['standard', 'express', 'pickup']);

export type CheckoutShippingRow = {
  id: ShippingMethod;
  label: string;
  cost: number;
};

export type CheckoutCountryRow = {
  name: string;
  vatPercent: number;
};

export type CheckoutDisplay = {
  shipping: CheckoutShippingRow[];
  countries: CheckoutCountryRow[];
  vatPercent: number;
  eurPerNad: number;
};

export function vatPercentFromFraction(vatRate: number): number {
  return Math.round(vatRate * 100000) / 1000;
}

export function checkoutDisplay(checkout: StorefrontCheckout, language: StorefrontLanguage): CheckoutDisplay {
  const vatPercent = vatPercentFromFraction(checkout.vatRate);
  const shipping: CheckoutShippingRow[] = [];
  for (const row of checkout.shipping) {
    if (!SHIPPING_METHODS.has(row.key)) continue;
    shipping.push({
      id: row.key as ShippingMethod,
      label: localized(row.title, language),
      cost: row.amountNad,
    });
  }
  const countries: CheckoutCountryRow[] = [];
  for (const code of checkout.vatCountries) {
    const name = CHECKOUT_COUNTRY_NAMES[code];
    if (!name) continue;
    countries.push({ name, vatPercent });
  }
  return { shipping, countries, vatPercent, eurPerNad: checkout.eurPerNad };
}

export function formatApproxEur(nad: number, eurPerNad: number): string {
  const safeNad = Number.isFinite(nad) ? nad : 0;
  const eur = Math.round(safeNad * eurPerNad * 100) / 100;
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(eur);
  return `approx. ${formatted}`;
}
