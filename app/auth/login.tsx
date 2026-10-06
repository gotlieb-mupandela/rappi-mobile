import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { GoogleButton, OrDivider } from '@/src/components/GoogleButton';
import { BrandMark, Field, FormScroll, PrimaryButton, Screen, TextButton } from '@/src/components/ui';
import { authErrorMessage, finishAuth } from '@/src/lib/navigation';
import { supabase } from '@/src/lib/supabase';
import { colors, displayTitle, fonts } from '@/src/theme';

export default function LoginScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) {
        setError(authErrorMessage(authError));
        return;
      }
      finishAuth(returnTo);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Sign in" back>
      <FormScroll>
        <BrandMark />
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.hint}>Use the same account as rappisportshub.com.</Text>
        <GoogleButton returnTo={returnTo} />
        <OrDivider />
        <Field
          placeholder="Email"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          placeholder="Password"
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => email && password && !busy && submit()}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={busy ? 'Please wait' : 'Sign in'} disabled={busy || !email.trim() || !password} onPress={submit} />
        <TextButton
          label="Create account"
          onPress={() => router.push(returnTo ? { pathname: '/auth/signup', params: { returnTo } } : '/auth/signup')}
        />
        <TextButton label="Forgot password" onPress={() => router.push('/auth/forgot')} />
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...displayTitle, marginTop: 8 },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginBottom: 8 },
  error: { fontFamily: fonts.body, color: colors.danger },
});
