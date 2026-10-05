import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError, isNetworkError, NETWORK_MESSAGE } from '@/src/api/client';
import { createPayment, openPaymentPage, waitForPaidPayment } from '@/src/api/checkout';
import type { ShippingMethod } from '@/src/api/types';
import { EmptyState, FormScroll, LabeledField, PrimaryButton, Screen } from '@/src/components/ui';
import { useAuth } from '@/src/lib/auth';
import { useBag } from '@/src/lib/bag';
import { formatMoney, vatOn } from '@/src/lib/money';
import { openLogin } from '@/src/lib/navigation';
import { fetchProfile, latestOrderId, waitForNewOrder } from '@/src/lib/orders';
import { colors, fonts, radius, sectionLabel } from '@/src/theme';

const SHIPPING: { id: ShippingMethod; label: string; cost: number }[] = [
  { id: 'standard', label: 'Standard (5–8 days)', cost: 100 },
  { id: 'express', label: 'Express (2–3 days)', cost: 150 },
  { id: 'pickup', label: 'Hub pickup', cost: 0 },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CheckoutScreen() {
  const { session, ready } = useAuth();
  const bag = useBag();
  const profile = useQuery({
    queryKey: ['profile', session?.user.id],
    enabled: !!session?.user.id,
    queryFn: () => fetchProfile(session!.user.id),
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState(session?.user.email ?? '');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [notes, setNotes] = useState('');
  const [shipping, setShipping] = useState<ShippingMethod>('standard');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const prefilled = useRef(false);

  useEffect(() => {
    if (ready && !session) {
      router.replace({ pathname: '/auth/login', params: { returnTo: '/checkout' } });
    }
  }, [ready, session]);

  useEffect(() => {
    if (prefilled.current || !session) return;
    if (profile.isPending) return;
    prefilled.current = true;
    const fullName = profile.data?.full_name || (session.user.user_metadata?.full_name as string | undefined) || '';
    setName((current) => current || fullName);
    setEmail((current) => current || profile.data?.email || session.user.email || '');
  }, [profile.data, profile.isPending, session]);

  const shippingCost = SHIPPING.find((item) => item.id === shipping)?.cost ?? 100;
  const vat = vatOn(bag.subtotal + shippingCost);
  const total = bag.subtotal + shippingCost + vat;
  const pickup = shipping === 'pickup';

  const canPay = useMemo(() => {
    if (!name.trim() || !EMAIL.test(email.trim()) || !phone.trim()) return false;
    if (!pickup && (!address.trim() || !city.trim())) return false;
    return bag.lines.length > 0;
  }, [address, bag.lines.length, city, email, name, phone, pickup]);

  const pay = async () => {
    if (!session) {
      openLogin('/checkout');
      return;
    }
    setBusy('Starting payment');
    setError(null);

    let payment: Awaited<ReturnType<typeof createPayment>>;
    let previousOrder: string | null | undefined;
    try {
      try {
        previousOrder = await latestOrderId();
      } catch {
        // Without a trustworthy baseline, never infer payment success from an existing order.
        previousOrder = undefined;
      }
      payment = await createPayment({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: pickup ? 'Hub pickup' : address.trim(),
        city: pickup ? '—' : city.trim(),
        country: 'Namibia',
        notes: notes.trim(),
        shippingMethod: shipping,
        lines: bag.lines.map((line) => ({ code: line.code, size: line.size, qty: line.qty })),
      });
      if (!payment?.paymentUrl) throw new ApiError("Payment couldn't be started. Try again.", 500);
    } catch (err) {
      setBusy(null);
      if (err instanceof ApiError && err.status === 401) {
        router.replace({ pathname: '/auth/login', params: { returnTo: '/checkout' } });
        return;
      }
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
        bag.applyStockError(err.message);
        setError(err.message);
        return;
      }
      setError(isNetworkError(err) ? NETWORK_MESSAGE : "Payment couldn't be started. Try again.");
      return;
    }

    let outcome: Awaited<ReturnType<typeof openPaymentPage>>;
    try {
      setBusy('Waiting for payment');
      outcome = await openPaymentPage(payment.paymentUrl);
    } catch {
      setBusy(null);
      setError("Can't open the payment page.");
      return;
    }

    if (outcome === 'cancel') {
      setBusy(null);
      router.replace({ pathname: '/checkout/result', params: { status: 'cancel' } });
      return;
    }

    setBusy('Checking your order');
    const paymentStatus = await waitForPaidPayment(payment.companyRef);
    if (paymentStatus?.status === 'cancelled') {
      setBusy(null);
      router.replace({ pathname: '/checkout/result', params: { status: 'cancel' } });
      return;
    }
    if (paymentStatus?.status === 'failed' || paymentStatus?.status === 'error') {
      setBusy(null);
      router.replace({ pathname: '/checkout/result', params: { status: 'failed' } });
      return;
    }
    const fallbackOrderId =
      !paymentStatus && previousOrder !== undefined
        ? await waitForNewOrder(previousOrder)
        : null;
    const orderId = paymentStatus?.orderId ?? fallbackOrderId;
    setBusy(null);
    if (paymentStatus?.status === 'paid' || fallbackOrderId) {
      bag.clear();
      router.replace({
        pathname: '/checkout/result',
        params: { status: 'paid', ref: payment.companyRef ?? '', orderId: orderId ?? '' },
      });
      return;
    }
    router.replace({ pathname: '/checkout/result', params: { status: 'unknown' } });
  };

  if (!session) {
    return <Screen title="Checkout" back>{null}</Screen>;
  }

  if (bag.ready && bag.lines.length === 0 && !busy) {
    return (
      <Screen title="Checkout" back>
        <EmptyState message="Your bag is empty." action="Browse shop" onPress={() => router.navigate('/(tabs)/shop')} />
      </Screen>
    );
  }

  return (
    <Screen title="Checkout" back>
      <FormScroll gap={10}>
        <Text style={sectionLabel}>DETAILS</Text>
        <View style={styles.section}>
          <LabeledField
            label="Full name"
            placeholder="Jane Doe"
            autoComplete="name"
            textContentType="name"
            value={name}
            onChangeText={setName}
          />
          <LabeledField
            label="Email"
            placeholder="jane@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <LabeledField
            label="Cell phone"
            placeholder="+264 81 123 4567"
            autoComplete="tel"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <Text style={[sectionLabel, styles.block]}>DELIVERY</Text>
        <View style={styles.section}>
          {SHIPPING.map((item) => {
            const selected = shipping === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setShipping(item.id)}
                style={({ pressed }) => [styles.ship, selected && styles.shipOn, pressed && styles.pressed]}>
                <View style={styles.shipCopy}>
                  <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                  <Text style={styles.shipLabel}>{item.label}</Text>
                </View>
                <Text style={styles.shipCost}>{formatMoney(item.cost)}</Text>
              </Pressable>
            );
          })}
          {!pickup ? (
            <>
              <LabeledField
                label="Address"
                placeholder="12 Independence Ave"
                autoComplete="street-address"
                textContentType="fullStreetAddress"
                value={address}
                onChangeText={setAddress}
              />
              <LabeledField
                label="City"
                placeholder="Windhoek"
                autoComplete="postal-address-locality"
                textContentType="addressCity"
                value={city}
                onChangeText={setCity}
              />
            </>
          ) : null}
          <View style={styles.country}>
            <Text style={styles.rowLabel}>Country</Text>
            <Text style={styles.rowValue}>Namibia</Text>
          </View>
          <LabeledField label="Order notes" optional placeholder="Anything we should know?" value={notes} onChangeText={setNotes} />
        </View>

        <Text style={[sectionLabel, styles.block]}>TOTAL</Text>
        <View style={styles.section}>
          <Row label="Merchandise" value={formatMoney(bag.subtotal)} />
          <Row label="Shipping" value={formatMoney(shippingCost)} />
          <Row label="VAT 15%" value={formatMoney(vat)} />
          <View style={styles.divider} />
          <Row label="Total" value={formatMoney(total)} bold />
          <Text style={styles.hint}>DPO confirms the final charged amount using live prices and stock.</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={busy ?? 'Pay with DPO'} disabled={!canPay || !!busy} onPress={pay} />
      </FormScroll>
    </Screen>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: 24 },
  section: {
    gap: 14,
    padding: 16,
    borderRadius: radius.card,
    backgroundColor: colors.elevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  ship: {
    minHeight: 56,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
  },
  shipOn: { borderWidth: 2, borderColor: colors.accent },
  pressed: { opacity: 0.85 },
  shipCopy: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  shipLabel: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  shipCost: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  country: {
    height: 48,
    borderRadius: radius.input,
    backgroundColor: colors.elevated,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 2 },
  rowLabel: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
  rowValue: { fontFamily: fonts.body, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  bold: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4, marginBottom: 6 },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.danger, marginBottom: 6 },
});
