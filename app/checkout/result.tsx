import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';

import { waitForPaidPayment } from '@/src/api/checkout';
import { paymentStatusRequest, viewForServerStatus, type PaymentView } from '@/src/api/paymentStatus';
import { PrimaryButton, Screen, SecondaryButton } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { useBag } from '@/src/lib/bag';
import { isOrderId } from '@/src/lib/orderId';
import { usePendingPayment } from '@/src/lib/pendingPayment';
import { askAndRegisterPush } from '@/src/lib/push';
import { makeStyles } from '@/src/lib/theme';
import { fonts, space } from '@/src/theme';

type Phase = 'checking' | PaymentView | 'unknown';

/**
 * Link query params are ignored. Paid is shown only after the signed-in user's
 * status call for the company reference stored when this app started checkout.
 */
export default function CheckoutResultScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const queryClient = useQueryClient();
  const payments = usePendingPayment();
  const { clear: clearBag } = useBag();
  const { loaded, finish } = payments;
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>('checking');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [shownRef, setShownRef] = useState<string | null>(null);
  const settled = useRef(false);
  const companyRef = payments.pending?.companyRef ?? null;

  useEffect(() => {
    if (settled.current) return;
    if (!loaded) return;
    const request = paymentStatusRequest(companyRef);
    if (!request || !companyRef) {
      setPhase('unknown');
      setOrderId(null);
      finish('unknown');
      return;
    }
    setShownRef(companyRef);
    setPhase('checking');
    setOrderId(null);
    let cancelled = false;
    void waitForPaidPayment(companyRef)
      .then((payment) => {
        if (cancelled || settled.current) return;
        const next = payment ? viewForServerStatus(payment.status) : 'pending';
        const serverOrderId = payment && isOrderId(payment.orderId) ? payment.orderId : null;
        setPhase(next);
        setOrderId(next === 'paid' ? serverOrderId : null);
        if (next === 'paid') {
          settled.current = true;
          clearBag();
          finish('settled');
          void queryClient.invalidateQueries({ queryKey: ['orders'] });
          void askAndRegisterPush();
        } else if (next === 'failed') {
          settled.current = true;
          finish('settled');
        } else {
          finish('unknown');
        }
      })
      .catch(() => {
        if (cancelled || settled.current) return;
        setPhase('unknown');
        finish('unknown');
      });
    return () => {
      cancelled = true;
      if (!settled.current) finish('unknown');
    };
  }, [attempt, clearBag, companyRef, finish, loaded, queryClient]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && !settled.current) setAttempt((value) => value + 1);
    });
    return () => sub.remove();
  }, []);

  const copy = {
    checking: { title: t('payment.checkingTitle'), body: t('payment.checkingBody') },
    paid: { title: t('payment.paidTitle'), body: t('payment.paidBody') },
    pending: { title: t('payment.pendingTitle'), body: t('payment.pendingBody') },
    failed: { title: t('payment.failedTitle'), body: t('payment.failedBody') },
    unknown: { title: t('payment.unknownTitle'), body: t('payment.unknownBody') },
  }[phase];

  const leave = (path: '/orders' | '/(tabs)/bag' | '/(tabs)') => {
    if (router.canDismiss()) router.dismissAll();
    if (path === '/orders') router.push('/orders');
    else router.navigate(path);
  };

  return (
    <Screen title={t('payment.title')}>
      <View style={styles.box}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        {phase === 'paid' && shownRef ? <Text style={styles.ref}>{t('payment.reference', { ref: shownRef })}</Text> : null}
        {phase === 'checking' ? null : (
          <View style={styles.actions}>
            {phase === 'pending' && companyRef ? (
              <PrimaryButton label={t('payment.checkAgain')} onPress={() => setAttempt((value) => value + 1)} />
            ) : null}
            {phase === 'paid' && orderId ? (
              <PrimaryButton
                label={t('payment.viewOrder')}
                onPress={() => {
                  if (router.canDismiss()) router.dismissAll();
                  router.push({ pathname: '/orders/[id]', params: { id: orderId } });
                }}
              />
            ) : phase === 'pending' ? (
              <SecondaryButton label={t('orders.title')} onPress={() => leave('/orders')} />
            ) : (
              <PrimaryButton label={t('orders.title')} onPress={() => leave('/orders')} />
            )}
            {phase === 'paid' ? (
              <SecondaryButton label={t('payment.keepShopping')} onPress={() => leave('/(tabs)')} />
            ) : (
              <SecondaryButton label={t('payment.backToBag')} onPress={() => leave('/(tabs)/bag')} />
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  box: { flex: 1, padding: space.screen, justifyContent: 'center', gap: 12 },
  title: { fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.muted },
  ref: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accentText },
  actions: { marginTop: 16, gap: 12 },
}));
