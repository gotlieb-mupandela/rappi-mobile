import { useState } from 'react';
import { Text } from 'react-native';

import { BrandMark, Field, FormScroll, PrimaryButton, Screen } from '@/src/components/ui';
import { authErrorMessage } from '@/src/lib/navigation';
import { supabase } from '@/src/lib/supabase';
import { makeStyles } from '@/src/lib/theme';
import { fonts } from '@/src/theme';

export default function ForgotScreen() {
  const styles = useStyles();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'rappisport://auth/reset',
      });
      if (authError) {
        setError(authErrorMessage(authError));
        return;
      }
      setInfo('Check your email for a reset link.');
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Forgot password" back>
      <FormScroll>
        <BrandMark />
        <Text style={styles.hint}>We’ll email you a link to choose a new password.</Text>
        <Field
          placeholder="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}
        <PrimaryButton label={busy ? 'Please wait' : 'Send reset email'} disabled={busy || !email.includes('@')} onPress={submit} />
      </FormScroll>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  hint: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  error: { fontFamily: fonts.body, color: colors.danger },
  info: { fontFamily: fonts.bodySemi, color: colors.accentText },
}));
