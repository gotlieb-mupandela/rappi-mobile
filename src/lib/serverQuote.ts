import { formatMoney, nadToEur } from './money.ts';

export const MAX_QUOTE_LINES = 50;
export const MAX_QUOTE_QTY = 99;

const SHIPPING_METHODS = ['standard', 'express', 'pickup'] as const;
export type QuoteShippingMethod = (typeof SHIPPING_METHODS)[number];

const CURRENCY_CODE = /^[A-Z]{3}$/;

export type QuoteLineInput = {
  code: unknown;
  size: unknown;
  qty: unknown;
};

export type QuoteLine = {
  code: string;
  size: string;
  qty: number;
};

export type PricedItem = {
  code: string;
  size: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

export type CartPrices = {
  items: PricedItem[];
  subtotal: number;
  currency: string;
};

export type CheckoutQuote = {
  items: PricedItem[];
  subtotal: number;
  shipping: number;
  vat: { rate: number; amount: number };
  total: number;
  currency: string;
};

export type QuoteBuildReason = 'too-many-lines' | 'invalid-qty' | 'invalid-line' | 'invalid-shipping' | 'invalid-country' | 'qty-cap';

export type BuiltRequest<T> = { ok: true; body: T } | { ok: false; reason: QuoteBuildReason };

export type CartPricesBody = { lines: QuoteLine[] };

export type CheckoutQuoteBody = {
  lines: QuoteLine[];
  shippingMethod: QuoteShippingMethod;
  country: string;
};

export type ValidateResult<T> = { ok: true; value: T } | { ok: false; reason: 'invalid-response' };

export class QuoteRequestError extends Error {
  readonly reason: QuoteBuildReason | 'invalid-response' | 'unexpected-currency';

  constructor(reason: QuoteBuildReason | 'invalid-response' | 'unexpected-currency') {
    super('Quote request was rejected.');
    this.name = 'QuoteRequestError';
    this.reason = reason;
  }
}

export type QuoteFailureCode = 'changed' | 'rate-limit' | 'network' | 'too-many' | 'invalid' | 'qty-cap' | 'currency' | 'failed';

export type PayableDisplay = {
  /** Amount charged, in the currency the server returned. */
  payable: string;
  /** Optional euro hint. Never the amount to pay. */
  approx: string | null;
};

/**
 * Positive integer only. Strings, booleans, and fractions are rejected
 * rather than coerced.
 */
function readQty(qty: unknown): number | null {
  if (typeof qty !== 'number') return null;
  if (!Number.isInteger(qty)) return null;
  if (qty < 1 || qty > Number.MAX_SAFE_INTEGER) return null;
  return qty;
}

function readLine(line: unknown): { ok: true; line: { code: string; size: string; qty: number } } | { ok: false; reason: 'invalid-line' | 'invalid-qty' } {
  if (!line || typeof line !== 'object') return { ok: false, reason: 'invalid-line' };
  const value = line as QuoteLineInput;
  if (typeof value.code !== 'string' || value.code.trim() === '' || typeof value.size !== 'string') {
    return { ok: false, reason: 'invalid-line' };
  }
  const qty = readQty(value.qty);
  if (qty === null) return { ok: false, reason: 'invalid-qty' };
  return { ok: true, line: { code: value.code, size: value.size, qty } };
}

/**
 * One row per code and size. The server checks stock per submitted line,
 * so duplicates are summed here. A merged quantity over 99 is refused
 * instead of being reduced. More than 50 lines is refused so the request
 * is never sent.
 */
export function mergeQuoteLines(lines: readonly unknown[]): BuiltRequest<QuoteLine[]> {
  if (lines.length < 1) return { ok: false, reason: 'invalid-line' };
  const order: string[] = [];
  const merged = new Map<string, QuoteLine>();
  for (const entry of lines) {
    const read = readLine(entry);
    if (!read.ok) return read;
    const key = `${read.line.code}\0${read.line.size}`;
    const existing = merged.get(key);
    if (!existing) {
      if (read.line.qty > MAX_QUOTE_QTY) return { ok: false, reason: 'qty-cap' };
      order.push(key);
      merged.set(key, { code: read.line.code, size: read.line.size, qty: read.line.qty });
      continue;
    }
    const qty = existing.qty + read.line.qty;
    if (qty > MAX_QUOTE_QTY) return { ok: false, reason: 'qty-cap' };
    existing.qty = qty;
  }
  if (order.length > MAX_QUOTE_LINES) return { ok: false, reason: 'too-many-lines' };
  return { ok: true, body: order.map((key) => merged.get(key) as QuoteLine) };
}

/** Same objects the quote sends. Payment start must use these lines and no others. */
export function paymentLinesMatchingQuote(quote: CheckoutQuoteBody): QuoteLine[] {
  return quote.lines.map((line) => ({ code: line.code, size: line.size, qty: line.qty }));
}

export function buildCartPricesRequest(lines: readonly unknown[]): BuiltRequest<CartPricesBody> {
  const merged = mergeQuoteLines(lines);
  if (!merged.ok) return merged;
  return { ok: true, body: { lines: merged.body.map((line) => ({ code: line.code, size: line.size, qty: line.qty })) } };
}

export function buildCheckoutQuoteRequest(
  lines: readonly unknown[],
  shippingMethod: unknown,
  country: unknown,
): BuiltRequest<CheckoutQuoteBody> {
  if (typeof shippingMethod !== 'string' || !SHIPPING_METHODS.includes(shippingMethod as QuoteShippingMethod)) {
    return { ok: false, reason: 'invalid-shipping' };
  }
  if (typeof country !== 'string' || country.trim() === '') {
    return { ok: false, reason: 'invalid-country' };
  }
  const merged = mergeQuoteLines(lines);
  if (!merged.ok) return merged;
  return {
    ok: true,
    body: {
      lines: merged.body.map((line) => ({ code: line.code, size: line.size, qty: line.qty })),
      shippingMethod: shippingMethod as QuoteShippingMethod,
      country,
    },
  };
}

export function cartInputKey(lines: readonly unknown[]): string {
  const built = buildCartPricesRequest(lines);
  if (!built.ok) return `invalid:${built.reason}:${lines.length}`;
  return JSON.stringify(built.body);
}

export function checkoutInputKey(lines: readonly unknown[], shippingMethod: string, country: string): string {
  const built = buildCheckoutQuoteRequest(lines, shippingMethod, country);
  if (!built.ok) return `invalid:${built.reason}:${lines.length}:${shippingMethod}:${country}`;
  return JSON.stringify(built.body);
}

function readMoney(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return Object.is(value, -0) ? 0 : value;
}

function readCurrency(value: unknown): string | null {
  if (typeof value !== 'string' || !CURRENCY_CODE.test(value)) return null;
  return value;
}

function readItem(value: unknown): PricedItem | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (typeof item.code !== 'string' || typeof item.size !== 'string') return null;
  const qty = readQty(item.qty);
  const unitPrice = readMoney(item.unitPrice);
  const lineTotal = readMoney(item.lineTotal);
  if (qty === null || qty > MAX_QUOTE_QTY || unitPrice === null || lineTotal === null) return null;
  return { code: item.code, size: item.size, qty, unitPrice, lineTotal };
}

function readItems(value: unknown, lines: readonly QuoteLine[]): PricedItem[] | null {
  if (!Array.isArray(value) || value.length !== lines.length) return null;
  const items: PricedItem[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const item = readItem(value[index]);
    const line = lines[index];
    if (!item || item.code !== line.code || item.size !== line.size || item.qty !== line.qty) return null;
    items.push(item);
  }
  return items;
}

export function validateCartPrices(payload: unknown, lines: readonly QuoteLine[]): ValidateResult<CartPrices> {
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'invalid-response' };
  const body = payload as Record<string, unknown>;
  const items = readItems(body.items, lines);
  const subtotal = readMoney(body.subtotal);
  const currency = readCurrency(body.currency);
  if (!items || subtotal === null || !currency) return { ok: false, reason: 'invalid-response' };
  return { ok: true, value: { items, subtotal, currency } };
}

export function validateCheckoutQuote(payload: unknown, lines: readonly QuoteLine[]): ValidateResult<CheckoutQuote> {
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'invalid-response' };
  const body = payload as Record<string, unknown>;
  const items = readItems(body.items, lines);
  const subtotal = readMoney(body.subtotal);
  const shipping = readMoney(body.shipping);
  const total = readMoney(body.total);
  const currency = readCurrency(body.currency);
  const vatRecord = body.vat;
  if (!items || subtotal === null || shipping === null || total === null || !currency) {
    return { ok: false, reason: 'invalid-response' };
  }
  if (!vatRecord || typeof vatRecord !== 'object') return { ok: false, reason: 'invalid-response' };
  const vatRate = readMoney((vatRecord as { rate?: unknown }).rate);
  const vatAmount = readMoney((vatRecord as { amount?: unknown }).amount);
  if (vatRate === null || vatAmount === null) return { ok: false, reason: 'invalid-response' };
  return {
    ok: true,
    value: { items, subtotal, shipping, vat: { rate: vatRate, amount: vatAmount }, total, currency },
  };
}

export function pricedItemFor(prices: CartPrices, code: string, size: string): PricedItem | null {
  return prices.items.find((item) => item.code === code && item.size === size) ?? null;
}

/** NAD line prices keep the usual whole-dollar form. Anything else is not shown as a price. */
export function formatQuotedAmount(amount: number, currency: 'NAD'): string;
export function formatQuotedAmount(amount: number, currency: string): string | null;
export function formatQuotedAmount(amount: number, currency: string): string | null {
  if (currency !== 'NAD') return null;
  return formatMoney(amount, 'na');
}

/**
 * Exact NAD amount charged, including cents. Shared by the checkout total
 * and the "You are charged" text on the approx line.
 */
export function formatChargedNad(amount: number): string {
  const cents = Math.round(amount * 100);
  const rounded = cents / 100;
  const figure = new Intl.NumberFormat('en-NA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
  return `N$${figure}`;
}

export function payableDisplay(amount: number, currency: string, showEurApprox: boolean): PayableDisplay | null {
  if (currency !== 'NAD') return null;
  const payable = formatChargedNad(amount);
  if (!showEurApprox) return { payable, approx: null };
  const euros = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(nadToEur(amount));
  return { payable, approx: `You are charged ${payable}, approx. ${euros}` };
}

/**
 * Fixed plain-text messages. Server error text is never copied in,
 * including text that contains HTML.
 */
export function quoteFailureCode(error: unknown): QuoteFailureCode {
  if (!error || typeof error !== 'object') return 'failed';
  const record = error as { name?: unknown; reason?: unknown; status?: unknown };
  if (record.name === 'QuoteRequestError') {
    if (record.reason === 'too-many-lines') return 'too-many';
    if (record.reason === 'qty-cap') return 'qty-cap';
    if (record.reason === 'unexpected-currency') return 'currency';
    if (
      record.reason === 'invalid-qty' ||
      record.reason === 'invalid-line' ||
      record.reason === 'invalid-shipping' ||
      record.reason === 'invalid-country'
    ) {
      return 'invalid';
    }
    return 'failed';
  }
  if (typeof record.status === 'number') {
    if (record.status === 400) return 'changed';
    if (record.status === 429) return 'rate-limit';
    if (record.status === 0) return 'network';
  }
  return 'failed';
}

export function quoteFailureText(code: QuoteFailureCode): string {
  switch (code) {
    case 'changed':
      return 'An item changed or is out of stock. Refresh your bag and try again.';
    case 'rate-limit':
      return 'Too many price checks. Wait a moment and try again.';
    case 'network':
      return "Can't reach the store. Try again.";
    case 'too-many':
      return 'The bag has too many items to price. Remove some and try again.';
    case 'qty-cap':
      return 'One size is over 99 items. Lower the quantity and try again.';
    case 'currency':
      return "The store total is not in NAD. Payment can't continue.";
    case 'invalid':
      return "The bag couldn't be priced. Refresh it and try again.";
    case 'failed':
      return "The total couldn't be confirmed. Try again.";
    default:
      return "The total couldn't be confirmed. Try again.";
  }
}

export function plainText(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
}

export type QuotePayView = {
  enabled: boolean;
  formReady: boolean;
  status: 'idle' | 'loading' | 'ready' | 'error';
  quoteKey: string | null;
  inputKey: string;
  freshForPay: boolean;
  /** True while a debounced quote has not been sent yet. */
  debouncePending?: boolean;
};

/**
 * Flag off: only the form gates Pay.
 * Flag on: Pay stays off while a quote is loading, waiting out the debounce,
 * failed, for different bag, shipping, or country inputs, or not yet refreshed
 * for this ready form.
 */
export function payBlockedForQuote(view: QuotePayView): boolean {
  if (!view.formReady) return true;
  if (!view.enabled) return false;
  if (view.debouncePending) return true;
  if (view.status !== 'ready') return true;
  if (view.quoteKey !== view.inputKey) return true;
  if (!view.freshForPay) return true;
  return false;
}

export const QUOTE_DEBOUNCE_MS = 400;

export type QuoteRefreshTimer = {
  readonly pending: boolean;
  schedule(delayMs: number, run: () => void): void;
  cancel(): void;
};

/** Collapses rapid quote changes into one later call. */
export function createQuoteRefreshTimer(
  setTimer: (run: () => void, delayMs: number) => ReturnType<typeof setTimeout>,
  clearTimer: (handle: ReturnType<typeof setTimeout>) => void,
): QuoteRefreshTimer {
  let handle: ReturnType<typeof setTimeout> | null = null;
  let token = 0;
  return {
    get pending() {
      return handle !== null;
    },
    schedule(delayMs, run) {
      token += 1;
      const current = token;
      if (handle !== null) clearTimer(handle);
      handle = setTimer(() => {
        if (current !== token) return;
        handle = null;
        run();
      }, delayMs);
    },
    cancel() {
      token += 1;
      if (handle !== null) clearTimer(handle);
      handle = null;
    },
  };
}

/**
 * Immediate for the first load, a manual retry, and the refresh just before Pay.
 * Quantity, shipping, country, and bag focus wait so rapid taps send one request.
 */
export function quoteRequestDelay(input: {
  enabled: boolean;
  hasLines: boolean;
  inputChanged: boolean;
  becameReady: boolean;
  retrying: boolean;
  becameEnabled: boolean;
  focusRefresh: boolean;
}): number | null {
  if (!input.enabled || !input.hasLines) return null;
  if (input.becameEnabled || input.retrying) return 0;
  if (input.becameReady && !input.inputChanged && !input.focusRefresh) return 0;
  if (input.inputChanged || input.focusRefresh) return QUOTE_DEBOUNCE_MS;
  return null;
}

export function shouldRequestQuote(input: {
  enabled: boolean;
  hasLines: boolean;
  inputChanged: boolean;
  becameReady: boolean;
  retrying: boolean;
  becameEnabled: boolean;
}): boolean {
  if (!input.enabled || !input.hasLines) return false;
  return input.inputChanged || input.becameReady || input.retrying || input.becameEnabled;
}
