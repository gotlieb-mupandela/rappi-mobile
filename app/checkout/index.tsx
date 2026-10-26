import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ApiError, isNetworkError, NETWORK_MESSAGE } from '@/src/api/client';
import { createPayment, openPaymentPage, waitForPaidPayment } from '@/src/api/checkout';
import type { ShippingMethod } from '@/src/api/types';
import { ActionSheet } from '@/src/components/settings';
import { EmptyState, FormScroll, LabeledField, PrimaryButton, Screen, SecondaryButton } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { useAuth } from '@/src/lib/auth';
import { useBag } from '@/src/lib/bag';
import { formatMoney as formatNad, vatOn } from '@/src/lib/money';
import { checkoutDisplay, checkoutPaymentFields, deriveCheckoutView, formatApproxEur } from '@/src/lib/storefront/checkoutDisplay';
import { CheckoutShippingState, CheckoutTotalsNote } from '@/src/lib/storefront/checkoutReview';
import { useStorefront } from '@/src/lib/storefront/provider';
import { openLogin } from '@/src/lib/navigation';
import { fetchProfile, latestOrderId, waitForNewOrder } from '@/src/lib/orders';
import { usePendingPayment } from '@/src/lib/pendingPayment';
import { makeStyles, useTheme } from '@/src/lib/theme';
import { fonts, radius } from '@/src/theme';

export default function CheckoutScreen() {
  const { market, t } = useLocale();
  const storefront = useStorefront();
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
  const [shipping, setShipping] = useState<ShippingMethod | null>(null);
  const [country, setCountry] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const prefilled = useRef(false);
  const language = market === 'eu' ? 'fr' : 'en';
  const display = useMemo(
    () => (storefront.feed ? checkoutDisplay(storefront.feed.checkout, language) : null),
    [language, storefront.feed],
  );
  const view = useMemo(
    () =>
      deriveCheckoutView({
        loading: storefront.loading,
        display,
        feedLoaded: storefront.feed !== null,
        selectedShipping: shipping ?? '',
        selectedCountry: country,
        totalsServer: t('checkout.totalsServer'),
        vatHiddenCopy: t('checkout.vatHidden'),
        name,
        email,
        phone,
        address,
        city,
        hasLines: bag.lines.length > 0,
      }),
    [
      address,
      bag.lines.length,
      city,
      country,
      display,
      email,
      name,
      phone,
      shipping,
      storefront.feed,
      storefront.loading,
      t,
    ],
  );
  const showMoney = (amount: number) => formatNad(amount, 'na');

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

  const shippingCost = view.shippingCost;
  const vatPercent = view.vatPercent;
  const vat = vatPercent === undefined ? 0 : vatOn(bag.subtotal + shippingCost, vatPercent);
  const total = bag.subtotal + shippingCost + vat;
  const pickup = view.selection?.shippingMethod === 'pickup';
  const canPay = view.canPay;

  const pay = async () => {
    if (!session) {
      openLogin('/checkout');
      return;
    }
    const fields = checkoutPaymentFields(view.selection);
    if (!fields) return;
    const shippingMethod = fields.shippingMethod;
    const paymentCountry = fields.country;
    setBusy(t('checkout.openingDpo'));
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
        country: paymentCountry,
        notes: notes.trim(),
        shippingMethod,
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

    await payments.start(payment.companyRef);

    let outcome: Awaited<ReturnType<typeof openPaymentPage>>;
    try {
      setBusy(t('checkout.openingDpo'));
      outcome = await openPaymentPage(payment.paymentUrl);
    } catch {
      payments.finish('settled');
      setBusy(null);
      setError("Can't open the payment page.");
      return;
    }

    if (outcome === 'cancel') {
      payments.finish('settled');
      setBusy(null);
      router.replace({ pathname: '/checkout/result', params: { status: 'cancel' } });
      return;
    }

    setBusy('Checking your order');
    let paymentStatus: Awaited<ReturnType<typeof waitForPaidPayment>> = null;
    let fallbackOrderId: string | null = null;
    try {
      paymentStatus = await waitForPaidPayment(payment.companyRef);
      if (!paymentStatus && previousOrder !== undefined) fallbackOrderId = await waitForNewOrder(previousOrder);
    } catch {
      // Treated as unconfirmed below; the saved payment is checked again when the app returns to the foreground.
    }
    setBusy(null);
    if (paymentStatus?.status === 'cancelled') {
      payments.finish('settled');
      router.replace({ pathname: '/checkout/result', params: { status: 'cancel' } });
      return;
    }
    if (paymentStatus?.status === 'failed' || paymentStatus?.status === 'error') {
      payments.finish('settled');
      router.replace({ pathname: '/checkout/result', params: { status: 'failed' } });
      return;
    }
    if (paymentStatus?.status === 'paid' || fallbackOrderId) {
      payments.finish('settled');
      bag.clear();
      router.replace({
        pathname: '/checkout/result',
        params: { status: 'paid', ref: payment.companyRef ?? '', orderId: paymentStatus?.orderId ?? fallbackOrderId ?? '' },
      });
      return;
    }
    payments.finish('unknown');
    router.replace({ pathname: '/checkout/result', params: { status: 'unknown' } });
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
          <CheckoutShippingState
            loading={view.loading}
            unavailable={view.unavailable}
            unsupported={view.unsupported}
            retrying={storefront.ready && storefront.loading}
            loadingText={t('checkout.shippingLoading')}
            unavailableText={t('checkout.shippingUnavailable')}
            unsupportedText={t('checkout.shippingUnsupported')}
            chooseText={view.rows.length > 0 && !shipping ? t('checkout.chooseShipping') : null}
            retryLabel={t('common.retry')}
            onRetry={() => storefront.reload()}
            rows={view.rows.map((item) => ({
              id: item.id,
              label: item.label,
              costLabel: showMoney(item.cost),
              selected: shipping === item.id,
            }))}
            onSelect={(id) => setShipping(id)}
            styles={styles}
          />
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
          {view.countryRows.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('checkout.country')}
              onPress={() => setCountryOpen(true)}
              style={({ pressed }) => [styles.country, pressed && styles.pressed]}>
              <Text style={styles.rowLabel}>{t('checkout.country')}</Text>
              <Text style={country ? styles.rowValue : styles.rowPlaceholder}>{country || t('checkout.chooseCountry')}</Text>
            </Pressable>
          ) : null}
          <LabeledField label={t('checkout.notes')} optional placeholder={t('checkout.notesPlaceholder')} value={notes} onChangeText={setNotes} />
        </View>

        <Text style={[sectionLabel, styles.block]}>{t('checkout.summary').toUpperCase()}</Text>
        <View style={styles.section}>
          <Row label={t('checkout.merchandise')} value={showMoney(bag.subtotal)} />
          <Row label={t('checkout.shipping')} value={showMoney(shippingCost)} />
          {vatPercent !== undefined ? <Row label={t('checkout.vat', { rate: vatPercent })} value={showMoney(vat)} /> : null}
          <View style={styles.divider} />
          <Row label={t('checkout.total')} value={showMoney(total)} bold />
          <CheckoutTotalsNote note={view.note} vatHidden={view.vatHidden} style={styles.hint} />
          {display && market === 'eu' ? <Text style={styles.hint}>{formatApproxEur(total, display.eurPerNad)}</Text> : null}
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
          disabled={!canPay || !!busy || payments.checking}
          onPress={pay}
        />
      </FormScroll>
      <ActionSheet
        visible={countryOpen}
        title={t('checkout.country')}
        onClose={() => setCountryOpen(false)}
        options={view.countryRows.map((item) => ({
          label: item.name,
          icon: country === item.name ? 'checkmark-circle' : 'ellipse-outline',
          onPress: () => setCountry(item.name),
        }))}
      />
    </Screen>
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
  rowPlaceholder: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
  bold: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 4, marginBottom: 6 },
  error: { fontFamily: fonts.body, fontSize: 14, color: colors.danger, marginBottom: 6 },
  pending: { gap: 8, padding: 16, borderRadius: radius.card, backgroundColor: colors.surface, marginBottom: 6 },
  pendingTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.warn },
  pendingBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text },
}));
