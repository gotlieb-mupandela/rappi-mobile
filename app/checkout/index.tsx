import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError, isNetworkError, NETWORK_MESSAGE } from '@/src/api/client';
import { createPayment, openPaymentPage } from '@/src/api/checkout';
import { PaymentUrlError } from '@/src/api/paymentUrl';
import type { ShippingMethod } from '@/src/api/types';
import { ActionSheet } from '@/src/components/settings';
import { EmptyState, FormScroll, LabeledField, PrimaryButton, Screen, SecondaryButton } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import type { Market } from '@/src/i18n/market';
import { useAuth } from '@/src/lib/auth';
import { useBag } from '@/src/lib/bag';
import { SERVER_QUOTE_CHECKOUT } from '@/src/lib/flags';
import { vatOn } from '@/src/lib/money';
import { openLogin } from '@/src/lib/navigation';
import { fetchProfile } from '@/src/lib/orders';
import { usePendingPayment } from '@/src/lib/pendingPayment';
import {
  buildCheckoutQuoteRequest,
  formatQuotedAmount,
  payBlockedForQuote,
  payableDisplay,
  paymentLinesMatchingQuote,
  plainText,
  quoteFailureText,
  type CheckoutQuote,
  type QuoteFailureCode,
} from '@/src/lib/serverQuote';
import { useCheckoutQuote } from '@/src/lib/useServerQuote';
import { makeStyles, useTheme } from '@/src/lib/theme';
import { fonts, radius } from '@/src/theme';

const SHIPPING: { id: ShippingMethod; labelKey: string; cost: number }[] = [
  { id: 'standard', labelKey: 'checkout.standard', cost: 100 },
  { id: 'express', labelKey: 'checkout.express', cost: 150 },
  { id: 'pickup', labelKey: 'checkout.pickup', cost: 0 },
];

const COUNTRIES = [
  ['Namibia', 15], ['South Africa', 15], ['Botswana', 14], ['France', 20], ['Belgium', 21],
  ['Luxembourg', 17], ['Germany', 19], ['Netherlands', 21], ['Spain', 21], ['Italy', 22],
  ['Portugal', 23], ['Austria', 20], ['Ireland', 23], ['Finland', 25.5], ['Sweden', 25],
  ['Denmark', 25], ['Greece', 24], ['Poland', 23], ['Czechia', 21], ['Slovakia', 23],
  ['Slovenia', 22], ['Croatia', 25], ['Hungary', 27], ['Romania', 21], ['Bulgaria', 20],
  ['Estonia', 24], ['Latvia', 21], ['Lithuania', 21], ['Malta', 18], ['Cyprus', 19],
  ['United Kingdom', 20], ['Switzerland', 8.1],
] as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CheckoutScreen() {
  const { market, formatMoney, t } = useLocale();
  const { session, ready } = useAuth();
  const { sectionLabel } = useTheme();
  const styles = useStyles();
  const bag = useBag();
  const payments = usePendingPayment();
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
  const [country, setCountry] = useState(market === 'eu' ? 'France' : 'Namibia');
  const [countryOpen, setCountryOpen] = useState(false);
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

  const pickup = shipping === 'pickup';

  const canPay = useMemo(() => {
    if (!name.trim() || !EMAIL.test(email.trim()) || !phone.trim()) return false;
    if (!pickup && (!address.trim() || !city.trim())) return false;
    return bag.lines.length > 0;
  }, [address, bag.lines.length, city, email, name, phone, pickup]);

  const quoteLines = useMemo(
    () => bag.lines.map((line) => ({ code: line.code, size: line.size, qty: line.qty })),
    [bag.lines],
  );
  const quote = useCheckoutQuote({
    enabled: SERVER_QUOTE_CHECKOUT,
    lines: quoteLines,
    shippingMethod: shipping,
    country,
    formReady: canPay,
  });
  const quoteCurrent = quote.inputKey === quote.requestKey;
  const payBlocked = payBlockedForQuote({
    enabled: SERVER_QUOTE_CHECKOUT,
    formReady: canPay,
    status: quoteCurrent ? quote.status : 'loading',
    quoteKey: quoteCurrent ? quote.quoteKey : null,
    inputKey: quote.requestKey,
    freshForPay: quoteCurrent && quote.freshForPay,
    debouncePending: quote.debouncePending,
  });

  const pay = async () => {
    if (payBlocked) return;
    if (!session) {
      openLogin('/checkout');
      return;
    }
    setBusy(t('checkout.openingDpo'));
    setError(null);

    const paymentLines = SERVER_QUOTE_CHECKOUT
      ? (() => {
          const built = buildCheckoutQuoteRequest(bag.lines, shipping, country);
          return built.ok ? paymentLinesMatchingQuote(built.body) : null;
        })()
      : bag.lines.map((line) => ({ code: line.code, size: line.size, qty: line.qty }));
    if (!paymentLines) {
      setBusy(null);
      return;
    }

    let payment: Awaited<ReturnType<typeof createPayment>>;
    try {
      payment = await createPayment({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: pickup ? 'Hub pickup' : address.trim(),
        city: pickup ? '—' : city.trim(),
        country,
        notes: notes.trim(),
        shippingMethod: shipping,
        lines: paymentLines,
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

    await payments.start(payment.companyRef);

    try {
      setBusy(t('checkout.openingDpo'));
      await openPaymentPage(payment.paymentUrl);
    } catch (err) {
      payments.finish('settled');
      setBusy(null);
      setError(err instanceof PaymentUrlError ? err.message : "Can't open the payment page.");
      return;
    }

    setBusy(null);
    router.replace({ pathname: '/checkout/result' });
  };

  if (!session) {
    return <Screen title={t('checkout.title')} back>{null}</Screen>;
  }

  if (bag.ready && bag.lines.length === 0 && !busy) {
    return (
      <Screen title={t('checkout.title')} back>
        <EmptyState message={t('bag.empty')} action={t('bag.browse')} onPress={() => router.navigate('/(tabs)/shop')} />
      </Screen>
    );
  }

  return (
    <Screen title={t('checkout.title')} back>
      <FormScroll gap={10}>
        <Text style={sectionLabel}>{t('checkout.details').toUpperCase()}</Text>
        <View style={styles.section}>
          <LabeledField
            label={t('checkout.fullName')}
            placeholder="Jane Doe"
            autoComplete="name"
            textContentType="name"
            value={name}
            onChangeText={setName}
          />
          <LabeledField
            label={t('checkout.email')}
            placeholder="jane@example.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <LabeledField
            label={t('checkout.phone')}
            placeholder="+264 81 123 4567"
            autoComplete="tel"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <Text style={[sectionLabel, styles.block]}>{t('checkout.delivery').toUpperCase()}</Text>
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
                  <Text style={styles.shipLabel}>{t(item.labelKey)}</Text>
                </View>
                {SERVER_QUOTE_CHECKOUT ? null : <Text style={styles.shipCost}>{formatMoney(item.cost)}</Text>}
              </Pressable>
            );
          })}
          {!pickup ? (
            <>
              <LabeledField
                label={t('checkout.address')}
                placeholder="12 Independence Ave"
                autoComplete="street-address"
                textContentType="fullStreetAddress"
                value={address}
                onChangeText={setAddress}
              />
              <LabeledField
                label={t('checkout.city')}
                placeholder="Windhoek"
                autoComplete="postal-address-locality"
                textContentType="addressCity"
                value={city}
                onChangeText={setCity}
              />
            </>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('checkout.country')}
            onPress={() => setCountryOpen(true)}
            style={({ pressed }) => [styles.country, pressed && styles.pressed]}>
            <Text style={styles.rowLabel}>{t('checkout.country')}</Text>
            <Text style={styles.rowValue}>{country}</Text>
          </Pressable>
          <LabeledField label={t('checkout.notes')} optional placeholder={t('checkout.notesPlaceholder')} value={notes} onChangeText={setNotes} />
        </View>

        <Text style={[sectionLabel, styles.block]}>{t('checkout.summary').toUpperCase()}</Text>
        <View style={styles.section}>
          {SERVER_QUOTE_CHECKOUT ? (
            <ServerQuoteSummary
              status={quoteCurrent ? quote.status : 'loading'}
              data={quoteCurrent ? quote.data : null}
              failureCode={quote.failureCode}
              market={market}
              onRetry={quote.retry}
            />
          ) : (
            <ClientTotals subtotal={bag.subtotal} shipping={shipping} country={country} />
          )}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {payments.pending && !busy ? (
          <View style={styles.pending}>
            <Text style={styles.pendingTitle}>{t('payment.pendingTitle')}</Text>
            <Text style={styles.pendingBody}>{t('payment.pendingBody')}</Text>
            <SecondaryButton
              label={t('payment.checkAgain')}
              disabled={payments.checking}
              onPress={() => void payments.recheck()}
            />
          </View>
        ) : null}
        <PrimaryButton
          label={busy ?? (payments.pending ? t('payment.payAgain') : t('checkout.payDpo'))}
          disabled={payBlocked || !!busy || payments.checking}
          onPress={pay}
        />
      </FormScroll>
      <ActionSheet
        visible={countryOpen}
        title={t('checkout.country')}
        onClose={() => setCountryOpen(false)}
        options={COUNTRIES.map(([name]) => ({
          label: name,
          icon: country === name ? 'checkmark-circle' : 'ellipse-outline',
          onPress: () => setCountry(name),
        }))}
      />
    </Screen>
  );
}

function ClientTotals({ subtotal, shipping, country }: { subtotal: number; shipping: ShippingMethod; country: string }) {
  const { formatMoney, t } = useLocale();
  const styles = useStyles();
  const shippingCost = SHIPPING.find((item) => item.id === shipping)?.cost ?? 100;
  const vatRate = COUNTRIES.find(([name]) => name === country)?.[1] ?? 15;
  const vat = vatOn(subtotal + shippingCost, vatRate);
  const total = subtotal + shippingCost + vat;
  return (
    <>
      <Row label={t('checkout.merchandise')} value={formatMoney(subtotal)} />
      <Row label={t('checkout.shipping')} value={formatMoney(shippingCost)} />
      <Row label={t('checkout.vat', { rate: vatRate })} value={formatMoney(vat)} />
      <View style={styles.divider} />
      <Row label={t('checkout.total')} value={formatMoney(total)} bold />
      <Text style={styles.hint}>{t('checkout.totalsNote')}</Text>
    </>
  );
}

function ServerQuoteSummary({
  status,
  data,
  failureCode,
  market,
  onRetry,
}: {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: CheckoutQuote | null;
  failureCode: QuoteFailureCode | null;
  market: Market;
  onRetry: () => void;
}) {
  const { t } = useLocale();
  const styles = useStyles();
  if (status !== 'ready' || data == null || data.currency !== 'NAD') {
    const foreignCurrency = status === 'ready' && data != null && data.currency !== 'NAD';
    const showError = foreignCurrency || (status === 'error' && failureCode != null);
    const message = quoteFailureText(foreignCurrency ? 'currency' : (failureCode ?? 'failed'));
    return (
      <View style={styles.quoteStatus}>
        {showError ? (
          <>
            <Text style={styles.error}>{plainText(message)}</Text>
            <SecondaryButton label={t('common.retry')} onPress={onRetry} />
          </>
        ) : (
          <Text style={styles.hint}>{t('checkout.quoteLoading')}</Text>
        )}
      </View>
    );
  }
  const total = payableDisplay(data.total, data.currency, market === 'eu');
  if (total == null) {
    return (
      <View style={styles.quoteStatus}>
        <Text style={styles.error}>{plainText(quoteFailureText('currency'))}</Text>
        <SecondaryButton label={t('common.retry')} onPress={onRetry} />
      </View>
    );
  }
  return (
    <>
      <Row label={t('checkout.merchandise')} value={formatQuotedAmount(data.subtotal, data.currency)} />
      <Row label={t('checkout.shipping')} value={formatQuotedAmount(data.shipping, data.currency)} />
      <Row label={t('checkout.vat', { rate: String(data.vat.rate) })} value={formatQuotedAmount(data.vat.amount, data.currency)} />
      <View style={styles.divider} />
      <Row label={t('checkout.total')} value={total.payable} bold />
      {total.approx ? <Text style={styles.approx}>{total.approx}</Text> : null}
      <Text style={styles.hint}>{t('checkout.serverTotalsNote')}</Text>
    </>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
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
  approx: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, textAlign: 'right' },
  quoteStatus: { gap: 10 },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.danger, marginBottom: 6 },
  pending: { gap: 8, padding: 16, borderRadius: radius.card, backgroundColor: colors.surface, marginBottom: 6 },
  pendingTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.warn },
  pendingBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text },
}));
