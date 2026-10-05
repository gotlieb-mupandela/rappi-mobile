import { router } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { colors } from '@/src/theme';

/** Android also routes the OAuth redirect here; the login screen finishes the sign-in. */
export default function OAuthCallbackScreen() {
  useEffect(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/account');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}
