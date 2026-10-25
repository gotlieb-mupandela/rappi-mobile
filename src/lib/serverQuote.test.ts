import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { mock, test } from 'node:test';

import { flagFromExtra } from './buildFlags.ts';
import {
  buildCartPricesRequest,
  buildCheckoutQuoteRequest,
  createQuoteRefreshTimer,
  formatChargedNad,
  formatQuotedAmount,
  MAX_QUOTE_LINES,
  payableDisplay,
  payBlockedForQuote,
  paymentLinesMatchingQuote,
  plainText,
  QUOTE_DEBOUNCE_MS,
  quoteFailureCode,
  quoteFailureText,
  quoteRequestDelay,
  QuoteRequestError,
  shouldRequestQuote,
  validateCartPrices,
  validateCheckoutQuote,
} from './serverQuote.ts';

const lines = [{ code: 'J.100', size: 'M', qty: 2 }];

function fixture(name: string): unknown {
  return JSON.parse(readFileSync(path.join(process.cwd(), 'src/api/fixtures', name), 'utf8'));
}

test('cart price fixture keeps server numbers and drops unknown fields', () => {
  const parsed = validateCartPrices(fixture('cart-prices.json'), lines);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.value, {
    items: [{ code: 'J.100', size: 'M', qty: 2, unitPrice: 150, lineTotal: 300 }],
    subtotal: 300,
    currency: 'NAD',
  });
  assert.equal('note' in parsed.value, false);
  assert.equal('name' in parsed.value.items[0], false);
});

test('checkout quote fixture keeps server totals and drops unknown fields', () => {
  const parsed = validateCheckoutQuote(fixture('checkout-quote.json'), lines);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(parsed.value, {
    items: [{ code: 'J.100', size: 'M', qty: 2, unitPrice: 150, lineTotal: 300 }],
    subtotal: 300,
    shipping: 100,
    vat: { rate: 15, amount: 60 },
    total: 460,
    currency: 'NAD',
  });
  assert.equal('price' in parsed.value, false);
  assert.equal('debug' in parsed.value, false);
  assert.equal('label' in parsed.value.vat, false);
});

test('validation does not recompute line totals or the payable total', () => {
  const parsed = validateCheckoutQuote(
    {
      items: [{ code: 'J.100', size: 'M', qty: 2, unitPrice: 150, lineTotal: 1, price: 999 }],
      subtotal: 4,
      shipping: 0,
      vat: { rate: 25.5, amount: 2 },
      total: 7,
      currency: 'NAD',
    },
    lines,
  );
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.value.items[0].lineTotal, 1);
  assert.equal(parsed.value.items[0].unitPrice, 150);
  assert.equal(parsed.value.subtotal, 4);
  assert.equal(parsed.value.vat.rate, 25.5);
  assert.equal(parsed.value.total, 7);
});

test('validation rejects bad numbers, currency, and lines that do not match the request', () => {
  const base = {
    items: [{ code: 'J.100', size: 'M', qty: 2, unitPrice: 150, lineTotal: 300 }],
    subtotal: 300,
    currency: 'NAD',
  };
  assert.equal(validateCartPrices({ ...base, subtotal: -1 }, lines).ok, false);
  assert.equal(validateCartPrices({ ...base, subtotal: Number.NaN }, lines).ok, false);
  assert.equal(validateCartPrices({ ...base, subtotal: Number.POSITIVE_INFINITY }, lines).ok, false);
  assert.equal(validateCartPrices({ ...base, subtotal: '300' }, lines).ok, false);
  assert.equal(validateCartPrices({ ...base, currency: 'nad' }, lines).ok, false);
  assert.equal(validateCartPrices({ ...base, currency: 'NA' }, lines).ok, false);
  assert.equal(validateCartPrices({ ...base, currency: 'NADX' }, lines).ok, false);
  assert.equal(validateCartPrices({ ...base, items: [{ ...base.items[0], qty: '2' }] }, lines).ok, false);
  assert.equal(validateCartPrices({ ...base, items: [{ ...base.items[0], qty: 1 }] }, lines).ok, false);
  assert.equal(validateCartPrices({ ...base, items: [{ code: 'OTHER', size: 'M', qty: 2, unitPrice: 1, lineTotal: 2 }] }, lines).ok, false);
  assert.equal(validateCartPrices({ ...base, items: [] }, lines).ok, false);
  assert.equal(validateCheckoutQuote({ ...base, shipping: -5, vat: { rate: 15, amount: 1 }, total: 1 }, lines).ok, false);
  assert.equal(validateCheckoutQuote(null, lines).ok, false);
});

test('cart and quote requests send code, size, and integer qty, never a price', () => {
  const dirty = [{ code: 'J.100', size: 'M', qty: 2, price: 10, unitPrice: 10, lineTotal: 20, name: 'Boot' }];
  const cart = buildCartPricesRequest(dirty);
  assert.equal(cart.ok, true);
  if (!cart.ok) return;
  assert.deepEqual(cart.body, { lines: [{ code: 'J.100', size: 'M', qty: 2 }] });
  assert.deepEqual(Object.keys(cart.body), ['lines']);
  assert.deepEqual(Object.keys(cart.body.lines[0]).sort(), ['code', 'qty', 'size']);
  assert.equal(typeof cart.body.lines[0].qty, 'number');
  assert.equal(Number.isInteger(cart.body.lines[0].qty), true);

  const quote = buildCheckoutQuoteRequest(dirty, 'express', 'France');
  assert.equal(quote.ok, true);
  if (!quote.ok) return;
  assert.deepEqual(quote.body, {
    lines: [{ code: 'J.100', size: 'M', qty: 2 }],
    shippingMethod: 'express',
    country: 'France',
  });
  assert.deepEqual(Object.keys(quote.body).sort(), ['country', 'lines', 'shippingMethod']);
  const encoded = JSON.parse(JSON.stringify(quote.body)) as { lines: { qty: unknown }[] };
  assert.equal(typeof encoded.lines[0].qty, 'number');
  assert.equal(encoded.lines[0].qty, 2);
  assert.equal(JSON.stringify(quote.body).includes('price'), false);
  assert.equal(JSON.stringify(quote.body).includes('unitPrice'), false);
  assert.equal(JSON.stringify(quote.body).includes('lineTotal'), false);
});

test('qty must be a real integer and is never coerced from a string or boolean', () => {
  for (const qty of ['2', true, false, 1.5, Number.NaN, null, undefined]) {
    const built = buildCartPricesRequest([{ code: 'J.100', size: 'M', qty }]);
    assert.equal(built.ok, false);
    if (!built.ok) assert.equal(built.reason, 'invalid-qty');
    assert.equal('body' in built, false);
  }
  const quote = buildCheckoutQuoteRequest([{ code: 'J.100', size: 'M', qty: '1' }], 'standard', 'Namibia');
  assert.equal(quote.ok, false);
  if (!quote.ok) assert.equal(quote.reason, 'invalid-qty');
});

test('payment start lines equal the merged quote lines', () => {
  const source = [
    { code: 'J.100', size: 'M', qty: 2, price: 40 },
    { code: 'J.100', size: 'M', qty: 3, unitPrice: 40 },
    { code: 'J.200', size: 'L', qty: 1, lineTotal: 9 },
  ];
  const quote = buildCheckoutQuoteRequest(source, 'standard', 'Namibia');
  assert.equal(quote.ok, true);
  if (!quote.ok) return;
  const paymentLines = paymentLinesMatchingQuote(quote.body);
  assert.deepEqual(paymentLines, quote.body.lines);
  assert.deepEqual(paymentLines, [
    { code: 'J.100', size: 'M', qty: 5 },
    { code: 'J.200', size: 'L', qty: 1 },
  ]);
  assert.equal(JSON.stringify({ lines: paymentLines }).includes('price'), false);

  const atCap = buildCartPricesRequest([
    { code: 'J.100', size: 'M', qty: 40 },
    { code: 'J.100', size: 'M', qty: 59 },
  ]);
  assert.equal(atCap.ok, true);
  if (atCap.ok) assert.equal(atCap.body.lines[0].qty, 99);
});

test('a merged quantity over 99 is not sent as a smaller total', () => {
  const over = buildCheckoutQuoteRequest(
    [
      { code: 'J.100', size: 'M', qty: 60, price: 12 },
      { code: 'J.100', size: 'M', qty: 50 },
    ],
    'express',
    'France',
  );
  assert.deepEqual(over, { ok: false, reason: 'qty-cap' });
  assert.equal(buildCartPricesRequest([{ code: 'J.100', size: 'M', qty: 100 }]).ok, false);
  assert.equal(quoteFailureCode(new QuoteRequestError('qty-cap')), 'qty-cap');
  const message = plainText(quoteFailureText('qty-cap'));
  assert.match(message, /99/);
  assert.equal(message.includes('<'), false);
  assert.equal(message.includes('price'), false);
});

test('more than 50 lines is not sent', () => {
  const tooMany = Array.from({ length: MAX_QUOTE_LINES + 1 }, (_, index) => ({
    code: `P${index}`,
    size: 'M',
    qty: 1,
    price: 9,
  }));
  const cart = buildCartPricesRequest(tooMany);
  assert.deepEqual(cart, { ok: false, reason: 'too-many-lines' });
  const quote = buildCheckoutQuoteRequest(tooMany, 'standard', 'Namibia');
  assert.deepEqual(quote, { ok: false, reason: 'too-many-lines' });

  const atLimit = tooMany.slice(0, MAX_QUOTE_LINES);
  const allowed = buildCartPricesRequest(atLimit);
  assert.equal(allowed.ok, true);
  if (allowed.ok) assert.equal(allowed.body.lines.length, MAX_QUOTE_LINES);
});

test('shipping method and country are constrained and prices stay off the body', () => {
  const denied = buildCheckoutQuoteRequest([{ code: 'J.100', size: 'M', qty: 1, price: 12 }], 'overnight', 'Namibia');
  assert.equal(denied.ok, false);
  assert.equal('body' in denied, false);
  assert.equal(buildCheckoutQuoteRequest([{ code: 'J.100', size: 'M', qty: 1 }], 'standard', '   ').ok, false);
  assert.equal(buildCheckoutQuoteRequest([], 'standard', 'Namibia').ok, false);
});

test('the charged total and the approx line share one two-decimal NAD format', () => {
  const cases = [
    [600, 'N$600.00'],
    [464.6, 'N$464.60'],
    [1234.5, 'N$1,234.50'],
  ] as const;
  for (const [amount, text] of cases) {
    assert.equal(formatChargedNad(amount), text);
    const shown = payableDisplay(amount, 'NAD', true);
    const hidden = payableDisplay(amount, 'NAD', false);
    assert.ok(shown);
    assert.ok(hidden);
    assert.equal(shown.payable, text);
    assert.equal(hidden.payable, text);
    assert.equal(hidden.approx, null);
    assert.equal(shown.approx?.includes(`You are charged ${text}`), true);
    assert.match(shown.approx ?? '', /approx\./);
    assert.match(shown.approx ?? '', /€/u);
    assert.equal(shown.payable.includes('€'), false);
    assert.equal(shown.payable.includes('approx'), false);
    assert.notEqual(shown.approx, shown.payable);
  }
  assert.equal(formatQuotedAmount(600, 'NAD'), 'N$600');
  assert.equal(formatQuotedAmount(464.6, 'NAD'), 'N$464.60');
  assert.equal(formatQuotedAmount(1234.5, 'NAD'), 'N$1,234.50');
});

test('a non-NAD total is refused and is not rendered as the payable amount', () => {
  assert.equal(payableDisplay(600, 'EUR', true), null);
  assert.equal(payableDisplay(600, 'ZAR', false), null);
  assert.equal(formatQuotedAmount(600, 'EUR'), null);
  assert.equal(formatQuotedAmount(1000, 'ZAR'), null);
  assert.equal(quoteFailureCode(new QuoteRequestError('unexpected-currency')), 'currency');
  const message = plainText(quoteFailureText('currency'));
  assert.match(message, /NAD/);
  assert.equal(message.includes('EUR'), false);
  assert.equal(message.includes('N$'), false);
  assert.equal(message.includes('<'), false);
  assert.equal(message.includes('€'), false);
  assert.equal(
    payBlockedForQuote({
      enabled: true,
      formReady: true,
      status: 'error',
      quoteKey: 'quote',
      inputKey: 'quote',
      freshForPay: false,
    }),
    true,
  );
});

test('quote failures use fixed plain text and do not echo server HTML', () => {
  const serverText = '<b>J.100</b> is out of stock<script>alert(1)</script>';
  const changed = quoteFailureCode({ name: 'ApiError', status: 400, message: serverText });
  const limited = quoteFailureCode({ name: 'ApiError', status: 429, message: serverText });
  const offline = quoteFailureCode({ name: 'ApiError', status: 0, message: serverText });
  const tooMany = quoteFailureCode(new QuoteRequestError('too-many-lines'));
  assert.equal(changed, 'changed');
  assert.equal(limited, 'rate-limit');
  assert.equal(offline, 'network');
  assert.equal(tooMany, 'too-many');
  assert.equal(quoteFailureCode(new QuoteRequestError('invalid-qty')), 'invalid');
  assert.equal(quoteFailureCode(new QuoteRequestError('invalid-response')), 'failed');

  for (const code of [changed, limited, offline, tooMany] as const) {
    const text = plainText(quoteFailureText(code));
    assert.equal(text.includes('J.100'), false);
    assert.equal(text.includes('<'), false);
    assert.equal(text.includes('>'), false);
    assert.equal(text.includes('alert'), false);
    assert.equal(text, quoteFailureText(code));
  }
  assert.match(quoteFailureText('changed'), /out of stock/i);
  assert.match(quoteFailureText('changed'), /refresh your bag/i);
});

test('Pay stays disabled for a loading, failed, or stale quote, and ignores quote state when the flag is off', () => {
  const current = '{"lines":[{"code":"J.100","size":"M","qty":1}]}';
  assert.equal(
    payBlockedForQuote({
      enabled: false,
      formReady: true,
      status: 'error',
      quoteKey: null,
      inputKey: current,
      freshForPay: false,
    }),
    false,
  );
  assert.equal(
    payBlockedForQuote({
      enabled: false,
      formReady: false,
      status: 'ready',
      quoteKey: current,
      inputKey: current,
      freshForPay: true,
    }),
    true,
  );
  assert.equal(
    payBlockedForQuote({
      enabled: true,
      formReady: true,
      status: 'loading',
      quoteKey: current,
      inputKey: current,
      freshForPay: false,
    }),
    true,
  );
  assert.equal(
    payBlockedForQuote({
      enabled: true,
      formReady: true,
      status: 'error',
      quoteKey: current,
      inputKey: current,
      freshForPay: false,
    }),
    true,
  );
  assert.equal(
    payBlockedForQuote({
      enabled: true,
      formReady: true,
      status: 'ready',
      quoteKey: 'older-bag',
      inputKey: current,
      freshForPay: true,
    }),
    true,
  );
  assert.equal(
    payBlockedForQuote({
      enabled: true,
      formReady: true,
      status: 'ready',
      quoteKey: current,
      inputKey: current,
      freshForPay: false,
    }),
    true,
  );
  assert.equal(
    payBlockedForQuote({
      enabled: true,
      formReady: true,
      status: 'ready',
      quoteKey: current,
      inputKey: current,
      freshForPay: true,
    }),
    false,
  );
  assert.equal(
    payBlockedForQuote({
      enabled: true,
      formReady: true,
      status: 'ready',
      quoteKey: current,
      inputKey: current,
      freshForPay: true,
      debouncePending: true,
    }),
    true,
  );
  assert.equal(
    payBlockedForQuote({
      enabled: false,
      formReady: true,
      status: 'ready',
      quoteKey: current,
      inputKey: current,
      freshForPay: true,
      debouncePending: true,
    }),
    false,
  );
});

test('rapid quantity, shipping, country, and focus changes send one quote after 400ms', () => {
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const sent: string[] = [];
    const timer = createQuoteRefreshTimer(
      (run, delayMs) => setTimeout(run, delayMs),
      (handle) => clearTimeout(handle),
    );
    for (const key of ['qty-2', 'qty-3', 'express', 'France', 'bag-focus']) {
      timer.schedule(QUOTE_DEBOUNCE_MS, () => sent.push(key));
      assert.equal(timer.pending, true);
    }
    assert.deepEqual(sent, []);
    mock.timers.tick(QUOTE_DEBOUNCE_MS - 1);
    assert.deepEqual(sent, []);
    mock.timers.tick(1);
    assert.deepEqual(sent, ['bag-focus']);
    assert.equal(timer.pending, false);
    assert.equal(QUOTE_DEBOUNCE_MS, 400);
  } finally {
    mock.timers.reset();
  }
});

test('quote delay waits on input and bag focus, and is immediate before Pay', () => {
  const base = {
    enabled: true,
    hasLines: true,
    inputChanged: false,
    becameReady: false,
    retrying: false,
    becameEnabled: false,
    focusRefresh: false,
  };
  assert.equal(quoteRequestDelay({ ...base, inputChanged: true }), QUOTE_DEBOUNCE_MS);
  assert.equal(quoteRequestDelay({ ...base, focusRefresh: true }), QUOTE_DEBOUNCE_MS);
  assert.equal(quoteRequestDelay({ ...base, becameReady: true }), 0);
  assert.equal(quoteRequestDelay({ ...base, becameEnabled: true, inputChanged: true }), 0);
  assert.equal(quoteRequestDelay({ ...base, retrying: true }), 0);
  assert.equal(quoteRequestDelay({ ...base, enabled: false, inputChanged: true, focusRefresh: true }), null);
  assert.equal(quoteRequestDelay(base), null);
});

test('a quote is requested when inputs change, when Pay is about to be enabled, and on retry', () => {
  const base = { enabled: true, hasLines: true, inputChanged: false, becameReady: false, retrying: false, becameEnabled: false };
  assert.equal(shouldRequestQuote({ ...base, inputChanged: true }), true);
  assert.equal(shouldRequestQuote({ ...base, becameReady: true }), true);
  assert.equal(shouldRequestQuote({ ...base, retrying: true }), true);
  assert.equal(shouldRequestQuote({ ...base, becameEnabled: true }), true);
  assert.equal(shouldRequestQuote(base), false);
  assert.equal(shouldRequestQuote({ ...base, enabled: false, inputChanged: true, becameReady: true }), false);
  assert.equal(shouldRequestQuote({ ...base, hasLines: false, inputChanged: true }), false);
});

test('SERVER_QUOTE_CHECKOUT turns on only for a boolean true in extra.flags', () => {
  assert.equal(flagFromExtra({ flags: { SERVER_QUOTE_CHECKOUT: true } }, 'SERVER_QUOTE_CHECKOUT'), true);
  assert.equal(flagFromExtra({ flags: { SERVER_QUOTE_CHECKOUT: false } }, 'SERVER_QUOTE_CHECKOUT'), false);
  assert.equal(flagFromExtra({ flags: { SERVER_QUOTE_CHECKOUT: 'true' } }, 'SERVER_QUOTE_CHECKOUT'), false);
  assert.equal(flagFromExtra({ flags: { SERVER_QUOTE_CHECKOUT: '1' } }, 'SERVER_QUOTE_CHECKOUT'), false);
  assert.equal(flagFromExtra({ flags: { SERVER_QUOTE_CHECKOUT: 1 } }, 'SERVER_QUOTE_CHECKOUT'), false);
  assert.equal(flagFromExtra({ SERVER_QUOTE_CHECKOUT: true }, 'SERVER_QUOTE_CHECKOUT'), false);
  assert.equal(flagFromExtra(undefined, 'SERVER_QUOTE_CHECKOUT'), false);
  assert.equal(flagFromExtra(null, 'SERVER_QUOTE_CHECKOUT'), false);
});
