import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { authErrorMessage, finishAuth } from '@/src/lib/navigation';
import { signInWithGoogle } from '@/src/lib/oauth';
import { makeStyles, useTheme } from '@/src/lib/theme';
import { fonts, radius } from '@/src/theme';

export function GoogleButton({ returnTo }: { returnTo?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const press = async () => {
    setBusy(true);
    setError(null);
    try {
      if (await signInWithGoogle()) {
        void queryClient.invalidateQueries({ queryKey: ['profile'] });
        finishAuth(returnTo);
      }
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ disabled: busy }}
        disabled={busy}
        onPress={press}
        style={({ pressed }) => [styles.button, pressed && styles.pressed, busy && styles.busy]}>
        {busy ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <>
            <Ionicons name="logo-google" size={20} color={colors.text} />
            <Text style={styles.label}>Continue with Google</Text>
          </>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function OrDivider() {
  const styles = useStyles();
  return (
    <View style={styles.divider}>
      <View style={styles.line} />
      <Text style={styles.or}>or</Text>
      <View style={styles.line} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  wrap: { gap: 8 },
  button: {
    height: 52,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  pressed: { opacity: 0.7 },
  busy: { opacity: 0.6 },
  label: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  error: { fontFamily: fonts.body, color: colors.danger },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  or: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
}));
