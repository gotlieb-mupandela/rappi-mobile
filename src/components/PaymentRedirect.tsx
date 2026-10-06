import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/src/lib/theme';

/**
 * Android also routes the payment page's `rappisport://checkout/...` redirect to a screen. The checkout screen underneath
 * is still checking the payment, so step back to it; with nothing underneath, the app was restarted mid-payment.
 */
export function PaymentRedirect({ status }: { status: 'unknown' | 'cancel' }) {
  const { colors } = useTheme();
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/checkout/result', params: { status } });
  }, [status]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}
