import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton, Screen, SecondaryButton } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { usePendingPayment } from '@/src/lib/pendingPayment';
import { askAndRegisterPush } from '@/src/lib/push';
import { makeStyles } from '@/src/lib/theme';
import { fonts, space } from '@/src/theme';

export default function CheckoutResultScreen() {
  const { t } = useLocale();
  const styles = useStyles();
  const { status, ref, orderId } = useLocalSearchParams<{ status?: string; ref?: string; orderId?: string }>();
  const queryClient = useQueryClient();
  const payments = usePendingPayment();
  const kind =
    status === 'paid' ? 'paid' : status === 'cancel' ? 'cancel' : status === 'failed' ? 'failed' : 'unknown';
  const copy = {
    paid: { title: t('payment.paidTitle'), body: t('payment.paidBody') },
    cancel: { title: t('payment.cancelTitle'), body: t('payment.cancelBody') },
    failed: { title: t('payment.failedTitle'), body: t('payment.failedBody') },
    unknown: { title: t('payment.unknownTitle'), body: t('payment.unknownBody') },
  }[kind];

  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: ['orders'] });
    if (kind === 'paid') void askAndRegisterPush();
  }, [kind, queryClient]);

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
        {kind === 'paid' && ref ? <Text style={styles.ref}>{t('payment.reference', { ref })}</Text> : null}
        <View style={styles.actions}>
          {kind === 'unknown' && payments.pending ? (
            <PrimaryButton
              label={t('payment.checkAgain')}
              disabled={payments.checking}
              onPress={() => void payments.recheck()}
            />
          ) : null}
          {kind === 'paid' && orderId ? (
            <PrimaryButton
              label={t('payment.viewOrder')}
              onPress={() => {
                if (router.canDismiss()) router.dismissAll();
                router.push({ pathname: '/orders/[id]', params: { id: orderId } });
              }}
            />
          ) : kind === 'unknown' && payments.pending ? (
            <SecondaryButton label={t('orders.title')} onPress={() => leave('/orders')} />
          ) : (
            <PrimaryButton label={t('orders.title')} onPress={() => leave('/orders')} />
          )}
          {kind === 'paid' ? (
            <SecondaryButton label={t('payment.keepShopping')} onPress={() => leave('/(tabs)')} />
          ) : (
            <SecondaryButton label={t('payment.backToBag')} onPress={() => leave('/(tabs)/bag')} />
          )}
        </View>
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
