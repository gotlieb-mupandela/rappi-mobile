import assert from 'node:assert/strict';
import test from 'node:test';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import type { ShippingMethod } from '../../api/types.ts';
import { beginCheckoutPayment, checkoutCanPay } from './checkoutDisplay.ts';
import { CheckoutShippingState, CheckoutTotalsNote, type CheckoutShippingRowView } from './checkoutReview.tsx';

const NOTE = 'Totals are approximate. The server confirms the final price.';
const VAT_HIDDEN = 'VAT is not shown for this country.';
const LOADING = 'Loading shipping options';
const UNAVAILABLE = "Can't load shipping options, try again";
const RETRY = 'Try again';

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

const form = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '0810000000',
  address: '12 Independence Ave',
  city: 'Windhoek',
  hasLines: true,
};

function textsOf(tree: ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).flatMap((node) => {
    const children = node.props.children;
    if (typeof children === 'string') return [children];
    if (Array.isArray(children)) return children.filter((child): child is string => typeof child === 'string');
    return [];
  });
}

function payPressable(tree: ReactTestRenderer) {
  const button = tree.root.findAllByType(Pressable).find((node) => node.props.accessibilityLabel === 'Pay with DPO');
  assert.ok(button);
  return button;
}

function CheckoutProbe({
  loading,
  unavailable,
  rows,
  note,
  vatHidden,
  payInput,
  onPayment,
}: {
  loading: boolean;
  unavailable: boolean;
  rows: CheckoutShippingRowView[];
  note: string;
  vatHidden: string | null;
  payInput: Parameters<typeof beginCheckoutPayment>[0];
  onPayment: (body: { shippingMethod: ShippingMethod; country: string }) => void;
}) {
  const selection = beginCheckoutPayment(payInput);
  const canPay = checkoutCanPay({
    selectionReady: selection !== null,
    ...form,
    pickup: selection?.shippingMethod === 'pickup',
  });
  return (
    <View>
      <CheckoutShippingState
        loading={loading}
        unavailable={unavailable}
        loadingText={LOADING}
        unavailableText={UNAVAILABLE}
        retryLabel={RETRY}
        onRetry={() => undefined}
        rows={rows}
        onSelect={() => undefined}
        styles={styles}
      />
      <CheckoutTotalsNote note={note} vatHidden={vatHidden} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Pay with DPO"
        accessibilityState={{ disabled: !canPay }}
        disabled={!canPay}
        onPress={() => {
          const next = beginCheckoutPayment(payInput);
          if (!next) return;
          onPayment({ shippingMethod: next.shippingMethod, country: next.country });
        }}>
        <Text>Pay with DPO</Text>
      </Pressable>
    </View>
  );
}

test('checkout screen shows the totals note, a loading state, and does not send standard before the feed is ready', () => {
  const sent: { shippingMethod: ShippingMethod; country: string }[] = [];
  const payInput = {
    enabled: true,
    feedLoaded: false,
    method: null,
    fallbackShipping: 'standard' as const,
    country: 'Namibia',
    countryNames: [] as string[],
  };
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <CheckoutProbe
        loading
        unavailable={false}
        rows={[]}
        note={NOTE}
        vatHidden={null}
        payInput={payInput}
        onPayment={(body) => sent.push(body)}
      />,
    );
  });
  const texts = textsOf(tree);
  assert.equal(texts.includes(NOTE), true);
  assert.equal(texts.includes(VAT_HIDDEN), false);
  assert.equal(texts.includes(LOADING), true);
  assert.equal(texts.includes(UNAVAILABLE), false);
  assert.equal(tree.root.findAllByType(ActivityIndicator).length, 1);
  const pay = payPressable(tree);
  assert.equal(pay.props.disabled, true);
  pay.props.onPress();
  assert.deepEqual(sent, []);
});

test('checkout screen shows the VAT-hidden line when the loaded country has no feed row', () => {
  const sent: { shippingMethod: ShippingMethod; country: string }[] = [];
  const payInput = {
    enabled: true,
    feedLoaded: true,
    method: 'express' as const,
    fallbackShipping: 'standard' as const,
    country: 'Botswana',
    countryNames: ['Namibia'],
  };
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <CheckoutProbe
        loading={false}
        unavailable={false}
        rows={[{ id: 'express', label: 'Express', costLabel: 'N$150', selected: true }]}
        note={NOTE}
        vatHidden={VAT_HIDDEN}
        payInput={payInput}
        onPayment={(body) => sent.push(body)}
      />,
    );
  });
  const note = tree.root.findByProps({ testID: 'checkout-totals-note' });
  assert.equal(note.props.children.includes(NOTE), true);
  assert.equal(note.props.children.includes(` ${VAT_HIDDEN}`), true);
  const pay = payPressable(tree);
  assert.equal(pay.props.disabled, true);
  pay.props.onPress();
  assert.deepEqual(sent, []);
});

test('checkout screen shows the shipping error after loading and keeps pay from sending standard', () => {
  const sent: { shippingMethod: ShippingMethod; country: string }[] = [];
  const payInput = {
    enabled: true,
    feedLoaded: true,
    method: null,
    fallbackShipping: 'standard' as const,
    country: 'Namibia',
    countryNames: ['Namibia'],
  };
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <CheckoutProbe
        loading={false}
        unavailable
        rows={[]}
        note={NOTE}
        vatHidden={null}
        payInput={payInput}
        onPayment={(body) => sent.push(body)}
      />,
    );
  });
  const texts = textsOf(tree);
  assert.equal(texts.includes(UNAVAILABLE), true);
  assert.equal(texts.includes(RETRY), true);
  assert.equal(texts.includes(LOADING), false);
  assert.equal(tree.root.findAllByType(ActivityIndicator).length, 0);
  assert.ok(tree.root.findByProps({ testID: 'checkout-shipping-unavailable' }));
  const pay = payPressable(tree);
  assert.equal(pay.props.disabled, true);
  pay.props.onPress();
  assert.deepEqual(sent, []);
});

test('checkout screen enables pay and sends the selected feed shipping key', () => {
  const sent: { shippingMethod: ShippingMethod; country: string }[] = [];
  const payInput = {
    enabled: true,
    feedLoaded: true,
    method: 'express' as const,
    fallbackShipping: 'standard' as const,
    country: 'Namibia',
    countryNames: ['Namibia', 'France'],
  };
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <CheckoutProbe
        loading={false}
        unavailable={false}
        rows={[{ id: 'express', label: 'Express', costLabel: 'N$150', selected: true }]}
        note={NOTE}
        vatHidden={null}
        payInput={payInput}
        onPayment={(body) => sent.push(body)}
      />,
    );
  });
  assert.equal(textsOf(tree).includes(NOTE), true);
  assert.equal(textsOf(tree).includes(VAT_HIDDEN), false);
  const pay = payPressable(tree);
  assert.equal(pay.props.disabled, false);
  pay.props.onPress();
  assert.deepEqual(sent, [{ shippingMethod: 'express', country: 'Namibia' }]);
});
