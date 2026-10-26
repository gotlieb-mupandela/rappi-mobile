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

/** True while a fetch is in flight and there are no usable shipping rows yet. */
export function shippingLoading(enabled: boolean, loading: boolean, rowCount: number): boolean {
  return enabled && loading && rowCount === 0;
}

/** True after loading has finished or failed and the feed has no usable shipping rows. */
export function shippingUnavailable(enabled: boolean, rowCount: number, loading = false): boolean {
  return enabled && !loading && rowCount === 0;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Flag on: a feed row for both shipping and country, or null.
 * Null means the payment call must not run, so the default method and country are not sent.
 * Flag off: the existing checkout selection.
 */
export function beginCheckoutPayment(input: {
  enabled: boolean;
  feedLoaded: boolean;
  method: ShippingMethod | null;
  fallbackShipping: ShippingMethod;
  country: string;
  countryNames: readonly string[];
}): { shippingMethod: ShippingMethod; country: string } | null {
  if (!input.enabled) {
    if (!PAYMENT_METHODS.has(input.fallbackShipping)) return null;
    return { shippingMethod: input.fallbackShipping, country: input.country };
  }
  if (!input.feedLoaded || !input.method) return null;
  if (!input.countryNames.includes(input.country)) return null;
  return { shippingMethod: input.method, country: input.country };
}

export function checkoutCanPay(input: {
  selectionReady: boolean;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  pickup: boolean;
  hasLines: boolean;
}): boolean {
  if (!input.selectionReady) return false;
  if (!input.name.trim() || !EMAIL.test(input.email.trim()) || !input.phone.trim()) return false;
  if (!input.pickup && (!input.address.trim() || !input.city.trim())) return false;
  return input.hasLines;
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
