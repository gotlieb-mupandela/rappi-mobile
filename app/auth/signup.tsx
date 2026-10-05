import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { GoogleButton, OrDivider } from '@/src/components/GoogleButton';
import { Field, FormScroll, PrimaryButton, Screen } from '@/src/components/ui';
import { authErrorMessage, finishAuth } from '@/src/lib/navigation';
import { supabase } from '@/src/lib/supabase';
import { colors, displayTitle, fonts } from '@/src/theme';

export default function SignupScreen() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (authError) {
        setError(authErrorMessage(authError));
        return;
      }
      if (!data.session) {
        setInfo('Check your email to confirm, then sign in.');
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      finishAuth(returnTo);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Create account" back>
      <FormScroll>
        <Text style={styles.heading}>Join Rappi</Text>
        <Text style={styles.hint}>One account for the app and rappisportshub.com.</Text>
        <GoogleButton returnTo={returnTo} />
        <OrDivider />
        <Field placeholder="Full name" autoComplete="name" textContentType="name" value={name} onChangeText={setName} />
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
          autoComplete="new-password"
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}
        <PrimaryButton
          label={busy ? 'Please wait' : 'Create account'}
          disabled={busy || !email.trim() || !password || !name.trim()}
          onPress={submit}
        />
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...displayTitle, marginTop: 8 },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginBottom: 8 },
  error: { fontFamily: fonts.body, color: colors.danger },
  info: { fontFamily: fonts.bodySemi, color: colors.accentText },
});
