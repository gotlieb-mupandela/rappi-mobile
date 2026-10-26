import type { ShippingMethod } from '@/src/api/types';
import { localized } from './adapt.ts';
import type { StorefrontCheckout, StorefrontLanguage } from './types.ts';

const SHIPPING_METHODS = new Set<string>(['standard', 'express', 'pickup']);

export type CheckoutShippingRow = {
  id: ShippingMethod;
  label: string;
  cost: number;
};

export type CheckoutCountryRow = {
  code: string;
  name: string;
  vatPercent: number;
};

export type CheckoutDisplay = {
  shipping: CheckoutShippingRow[];
  countries: CheckoutCountryRow[];
  /** Fresh map from the validated country name to its percent. Missing name means no estimate. */
  vatByName: ReadonlyMap<string, number>;
  eurPerNad: number;
};

export function vatPercentFromFraction(vatRate: number): number {
  return Math.round(vatRate * 100000) / 1000;
}

export function checkoutDisplay(checkout: StorefrontCheckout, language: StorefrontLanguage): CheckoutDisplay {
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
  const vatByName = new Map<string, number>();
  for (const row of checkout.countries) {
    const vatPercent = vatPercentFromFraction(row.vatRate);
    countries.push({ code: row.code, name: row.name, vatPercent });
    if (!vatByName.has(row.name)) vatByName.set(row.name, vatPercent);
  }
  return { shipping, countries, vatByName, eurPerNad: checkout.eurPerNad };
}

/** Undefined when this country has no feed rate. Callers must not substitute a hardcoded rate. */
export function vatPercentForCountry(display: CheckoutDisplay, countryName: string): number | undefined {
  return display.vatByName.get(countryName);
}

const PAYMENT_METHODS = new Set<ShippingMethod>(['standard', 'express', 'pickup']);

/** Flag on: the selected feed row, or null. Never substitutes the app's default method. */
export function selectedPaymentMethod(
  enabled: boolean,
  rows: readonly { id: ShippingMethod }[],
  selected: string,
): ShippingMethod | null {
  if (!enabled) return PAYMENT_METHODS.has(selected as ShippingMethod) ? (selected as ShippingMethod) : null;
  return rows.find((row) => row.id === selected)?.id ?? null;
}

export function shippingUnavailable(enabled: boolean, rowCount: number): boolean {
  return enabled && rowCount === 0;
}

/** Flag-on totals note. VAT-hidden copy is added only when this country has no feed rate. */
export function flagOnTotalsNote(vatShown: boolean): 'totals' | 'totals-and-vat-hidden' {
  return vatShown ? 'totals' : 'totals-and-vat-hidden';
}

/** EU-market line under the N$ total. `eurPerNad` is euros for 1 N$. */
export function formatApproxEur(nad: number, eurPerNad: number): string {
  const safeNad = Number.isFinite(nad) ? nad : 0;
  const eur = Math.round(safeNad * eurPerNad * 100) / 100;
  return `Approx. EUR ${eur.toFixed(2)}`;
}
