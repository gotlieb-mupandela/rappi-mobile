import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen, SecondaryButton } from '@/src/components/ui';
import { askAndRegisterPush } from '@/src/lib/push';
import { colors, fonts, space } from '@/src/theme';

const COPY = {
  paid: { title: 'Payment received', body: 'A receipt is emailed to you.' },
  cancel: { title: 'Payment cancelled', body: 'Your bag is still here.' },
  failed: { title: 'Payment failed', body: "You weren't charged. Your bag is still here." },
  unknown: { title: 'Payment not confirmed yet', body: 'If you finished paying, check Orders in a moment.' },
};

export default function CheckoutResultScreen() {
  const { status, ref, orderId } = useLocalSearchParams<{ status?: string; ref?: string; orderId?: string }>();
  const queryClient = useQueryClient();
  const kind =
    status === 'paid' ? 'paid' : status === 'cancel' ? 'cancel' : status === 'failed' ? 'failed' : 'unknown';
  const copy = COPY[kind];

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
    <Screen title="Payment">
      <View style={styles.box}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        {kind === 'paid' && ref ? <Text style={styles.ref}>Reference {ref}</Text> : null}
        <View style={styles.actions}>
          {kind === 'paid' && orderId ? (
            <PrimaryButton
              label="View order"
              onPress={() => {
                if (router.canDismiss()) router.dismissAll();
                router.push({ pathname: '/orders/[id]', params: { id: orderId } });
              }}
            />
          ) : (
            <PrimaryButton label="Orders" onPress={() => leave('/orders')} />
          )}
          {kind === 'paid' ? (
            <SecondaryButton label="Keep shopping" onPress={() => leave('/(tabs)')} />
          ) : (
            <SecondaryButton label="Back to bag" onPress={() => leave('/(tabs)/bag')} />
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: space.screen, justifyContent: 'center', gap: 12 },
  title: { fontFamily: fonts.displayBold, fontSize: 26, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: colors.muted },
  ref: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.accentText },
  actions: { marginTop: 16, gap: 12 },
});
