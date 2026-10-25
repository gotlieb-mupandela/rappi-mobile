import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/src/lib/theme';

/**
 * Android also routes the payment page's `rappisport://checkout/...` redirect to a screen. The checkout screen underneath
 * is still waiting on the browser, so step back to it. With nothing underneath, the app was restarted mid-payment.
 * The result screen confirms with the server. This redirect does not carry a payment status.
 */
export function PaymentRedirect() {
  const { colors } = useTheme();
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace({ pathname: '/checkout/result' });
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}
