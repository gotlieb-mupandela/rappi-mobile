import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { ShippingMethod } from '../../api/types.ts';
import { en } from '../../i18n/en.ts';
import { checkoutDisplay, checkoutPaymentFields, deriveCheckoutView, type CheckoutDisplay } from './checkoutDisplay.ts';
import { CheckoutShippingState, CheckoutTotalsNote } from './checkoutReview.tsx';
import { validateMobileStorefront } from './contract.ts';

const NOTE = en.checkout.totalsServer;
const VAT_HIDDEN = en.checkout.vatHidden;
const LOADING = en.checkout.shippingLoading;
const UNAVAILABLE = en.checkout.shippingUnavailable;
const RETRY = en.common.retry;
const PAY = en.checkout.payDpo;
const DEFAULT_COUNTRY = 'Namibia';
const DEFAULT_METHOD = 'standard';

const styles = {
  pending: {},
  pendingBody: {},
  ship: {},
  shipOn: {},
  pressed: {},
  shipCopy: {},
  radio: {},
  radioOn: {},
  radioDot: {},
  shipLabel: {},
  shipCost: {},
};

function fixtureCheckout() {
  const parsed = validateMobileStorefront(JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8')));
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.value.checkout;
}

const checkout = fixtureCheckout();
const loadedDisplay = checkoutDisplay(checkout, 'en');

type ViewInput = Parameters<typeof deriveCheckoutView>[0];

function flagOnInput(overrides: Partial<ViewInput> = {}): ViewInput {
  return {
    enabled: true,
    loading: false,
    display: null,
    feedLoaded: false,
    selectedShipping: DEFAULT_METHOD,
    selectedCountry: DEFAULT_COUNTRY,
    fallbackRows: [],
    fallbackCountries: [],
    fallbackVatPercent: 15,
    fallbackShippingCost: 100,
    totalsNote: en.checkout.totalsNote,
    totalsServer: NOTE,
    vatHiddenCopy: VAT_HIDDEN,
    name: 'Jane Doe',
    email: 'jane@example.com',
    phone: '0810000000',
    address: '12 Independence Ave',
    city: 'Windhoek',
    hasLines: true,
    ...overrides,
  };
}

function textsOf(tree: ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).flatMap((node) => {
    const children = node.props.children;
    if (typeof children === 'string') return [children];
    if (Array.isArray(children)) return children.filter((child): child is string => typeof child === 'string');
    return [];
  });
}

function visibleText(tree: ReactTestRenderer): string {
  return textsOf(tree).join('\n');
}

function payPressable(tree: ReactTestRenderer) {
  const button = tree.root.findAllByType(Pressable).find((node) => node.props.accessibilityLabel === PAY);
  assert.ok(button);
  return button;
}

function retryPressable(tree: ReactTestRenderer) {
  return tree.root.findAllByType(Pressable).find((node) => node.props.accessibilityLabel === RETRY);
}

/** Renders the screen's review section from the same derivation the screen calls. */
function CheckoutReviewHarness({
  input,
  retrying,
  onRetry,
  onPayment,
}: {
  input: ViewInput;
  retrying: boolean;
  onRetry: () => void;
  onPayment: (body: { shippingMethod: ShippingMethod; country: string }) => void;
}) {
  const view = deriveCheckoutView(input);
  return (
    <View>
      <CheckoutShippingState
        loading={view.loading}
        unavailable={view.unavailable}
        retrying={retrying}
        loadingText={LOADING}
        unavailableText={UNAVAILABLE}
        retryLabel={RETRY}
        onRetry={onRetry}
        rows={view.rows.map((item) => ({
          id: item.id,
          label: item.label,
          costLabel: `N$${item.cost}`,
          selected: item.id === input.selectedShipping,
        }))}
        onSelect={() => undefined}
        styles={styles}
      />
      <CheckoutTotalsNote note={view.note} vatHidden={view.vatHidden} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={PAY}
        accessibilityState={{ disabled: !view.canPay }}
        disabled={!view.canPay}
        onPress={() => {
          const fields = checkoutPaymentFields(view.selection);
          if (!fields) return;
          onPayment(fields);
        }}>
        <Text>{PAY}</Text>
      </Pressable>
    </View>
  );
}

function renderReview(
  input: ViewInput,
  retrying: boolean,
  onPayment: (body: { shippingMethod: ShippingMethod; country: string }) => void,
  onRetry: () => void = () => undefined,
) {
  const view = deriveCheckoutView(input);
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<CheckoutReviewHarness input={input} retrying={retrying} onRetry={onRetry} onPayment={onPayment} />);
  });
  return { tree, view };
}

function assertNothingSent(sent: { shippingMethod: ShippingMethod; country: string }[], view: ReturnType<typeof deriveCheckoutView>, tree: ReactTestRenderer) {
  assert.equal(view.selection, null);
  assert.equal(checkoutPaymentFields(view.selection), null);
  const pay = payPressable(tree);
  assert.equal(pay.props.disabled, true);
  pay.props.onPress();
  assert.deepEqual(sent, []);
}

test('checkout review shows the approximate totals note and a loading state before the feed arrives', () => {
  const sent: { shippingMethod: ShippingMethod; country: string }[] = [];
  const input = flagOnInput({ loading: true, display: null, feedLoaded: false });
  const { tree, view } = renderReview(input, false, (body) => sent.push(body));
  const texts = visibleText(tree);
  assert.equal(view.vatHidden, VAT_HIDDEN);
  assert.equal(texts.includes(NOTE), true);
  assert.equal(texts.includes(VAT_HIDDEN), true);
  assert.equal(texts.includes(LOADING), true);
  assert.equal(texts.includes(UNAVAILABLE), false);
  assert.equal(retryPressable(tree), undefined);
  assert.equal(tree.root.findAllByType(ActivityIndicator).length, 1);
  assert.ok(tree.root.findByProps({ testID: 'checkout-shipping-loading' }));
  assertNothingSent(sent, view, tree);
});

test('checkout review says VAT is hidden when the loaded country has no feed rate', () => {
  const sent: { shippingMethod: ShippingMethod; country: string }[] = [];
  const input = flagOnInput({
    display: loadedDisplay,
    feedLoaded: true,
    selectedShipping: 'express',
    selectedCountry: 'Botswana',
  });
  const { tree, view } = renderReview(input, false, (body) => sent.push(body));
  const note = tree.root.findByProps({ testID: 'checkout-totals-note' });
  assert.equal(view.vatPercent, undefined);
  assert.equal(view.vatHidden, VAT_HIDDEN);
  assert.equal(note.props.children.includes(NOTE), true);
  assert.equal(note.props.children.includes(` ${VAT_HIDDEN}`), true);
  assert.equal(visibleText(tree).includes(LOADING), false);
  assert.equal(visibleText(tree).includes(UNAVAILABLE), false);
  assertNothingSent(sent, view, tree);
});

test('checkout review says VAT is hidden when the flag is on and there is no feed', () => {
  const sent: { shippingMethod: ShippingMethod; country: string }[] = [];
  const input = flagOnInput({ loading: false, display: null, feedLoaded: false });
  const { tree, view } = renderReview(input, false, (body) => sent.push(body));
  const texts = visibleText(tree);
  assert.equal(view.vatHidden, VAT_HIDDEN);
  assert.equal(texts.includes(NOTE), true);
  assert.equal(texts.includes(VAT_HIDDEN), true);
  assert.equal(texts.includes(UNAVAILABLE), true);
  assert.equal(texts.includes(RETRY), true);
  assert.equal(texts.includes(LOADING), false);
  assert.equal(tree.root.findAllByType(ActivityIndicator).length, 0);
  const retry = retryPressable(tree);
  assert.ok(retry);
  assert.equal(retry.props.disabled, false);
  assert.deepEqual(retry.props.accessibilityState, { disabled: false, busy: false });
  assertNothingSent(sent, view, tree);
});

test('checkout review keeps pay disabled after a load with no shipping rows', () => {
  const sent: { shippingMethod: ShippingMethod; country: string }[] = [];
  const empty: CheckoutDisplay = checkoutDisplay({ ...checkout, shipping: [] }, 'en');
  const input = flagOnInput({
    display: empty,
    feedLoaded: true,
    selectedShipping: DEFAULT_METHOD,
    selectedCountry: DEFAULT_COUNTRY,
  });
  const { tree, view } = renderReview(input, false, (body) => sent.push(body));
  const texts = visibleText(tree);
  assert.equal(texts.includes(UNAVAILABLE), true);
  assert.equal(texts.includes(RETRY), true);
  assert.equal(texts.includes(LOADING), false);
  assert.equal(view.rows.length, 0);
  assertNothingSent(sent, view, tree);
});

test('checkout review enables pay with the selected feed shipping key and country name', () => {
  const sent: { shippingMethod: ShippingMethod; country: string }[] = [];
  const input = flagOnInput({
    display: loadedDisplay,
    feedLoaded: true,
    selectedShipping: 'express',
    selectedCountry: DEFAULT_COUNTRY,
  });
  const { tree, view } = renderReview(input, false, (body) => sent.push(body));
  assert.equal(visibleText(tree).includes(NOTE), true);
  assert.equal(view.vatHidden, null);
  assert.equal(visibleText(tree).includes(VAT_HIDDEN), false);
  assert.equal(view.vatPercent, 15);
  const pay = payPressable(tree);
  assert.equal(pay.props.disabled, false);
  pay.props.onPress();
  assert.deepEqual(sent, [{ shippingMethod: 'express', country: 'Namibia' }]);
});

test('checkout review disables Retry while a reload is in flight', () => {
  const sent: { shippingMethod: ShippingMethod; country: string }[] = [];
  let retries = 0;
  const input = flagOnInput({ loading: true, display: null, feedLoaded: false });
  const { tree, view } = renderReview(input, true, (body) => sent.push(body), () => {
    retries += 1;
  });
  const texts = visibleText(tree);
  assert.equal(view.loading, true);
  assert.equal(view.unavailable, false);
  assert.equal(texts.includes(LOADING), true);
  assert.equal(texts.includes(UNAVAILABLE), false);
  assert.equal(texts.includes(VAT_HIDDEN), true);
  const retry = retryPressable(tree);
  assert.ok(retry);
  assert.equal(retry.props.disabled, true);
  assert.deepEqual(retry.props.accessibilityState, { disabled: true, busy: true });
  assert.equal(retry.props.style.opacity, 0.4);
  retry.props.onPress();
  assert.equal(retries, 0);
  assert.equal(tree.root.findAllByType(ActivityIndicator).length, 2);
  assertNothingSent(sent, view, tree);
});
