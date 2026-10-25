import { apiFetch } from '@/src/api/client';
import {
  buildCartPricesRequest,
  buildCheckoutQuoteRequest,
  QuoteRequestError,
  quoteFailureText,
  validateCartPrices,
  validateCheckoutQuote,
  type CartPrices,
  type CheckoutQuote,
  type QuoteLineInput,
} from '@/src/lib/serverQuote';

async function postQuote(path: '/api/cart/prices' | '/api/checkout/quote', body: unknown): Promise<unknown> {
  return apiFetch<unknown>(path, {
    method: 'POST',
    body,
    cache: 'no-store',
    fallbackMessage: quoteFailureText('failed'),
  });
}

export async function fetchCartPrices(lines: readonly QuoteLineInput[]): Promise<CartPrices> {
  const built = buildCartPricesRequest(lines);
  if (!built.ok) throw new QuoteRequestError(built.reason);
  const payload = await postQuote('/api/cart/prices', built.body);
  const parsed = validateCartPrices(payload, built.body.lines);
  if (!parsed.ok) throw new QuoteRequestError(parsed.reason);
  return parsed.value;
}

export async function fetchCheckoutQuote(
  lines: readonly QuoteLineInput[],
  shippingMethod: string,
  country: string,
): Promise<CheckoutQuote> {
  const built = buildCheckoutQuoteRequest(lines, shippingMethod, country);
  if (!built.ok) throw new QuoteRequestError(built.reason);
  const payload = await postQuote('/api/checkout/quote', built.body);
  const parsed = validateCheckoutQuote(payload, built.body.lines);
  if (!parsed.ok) throw new QuoteRequestError(parsed.reason);
  return parsed.value;
}
