import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { GoogleButton, OrDivider } from '@/src/components/GoogleButton';
import { BrandMark, Field, FormScroll, PrimaryButton, Screen, TextButton } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { authErrorMessage, finishAuth } from '@/src/lib/navigation';
import { supabase } from '@/src/lib/supabase';
import { makeStyles } from '@/src/lib/theme';
import { fonts } from '@/src/theme';

export default function LoginScreen() {
  const { t } = useLocale();
  const styles = useStyles();
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
    <Screen title={t('auth.signIn')} back>
      <FormScroll>
        <BrandMark />
        <Text style={styles.heading}>{t('auth.welcomeBack')}</Text>
        <Text style={styles.hint}>{t('auth.loginHint')}</Text>
        <GoogleButton returnTo={returnTo} />
        <OrDivider />
        <Field
          placeholder={t('auth.email')}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          placeholder={t('auth.password')}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={() => email && password && !busy && submit()}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={busy ? t('auth.pleaseWait') : t('auth.signIn')} disabled={busy || !email.trim() || !password} onPress={submit} />
        <TextButton
          label={t('auth.createAccount')}
          onPress={() => router.push(returnTo ? { pathname: '/auth/signup', params: { returnTo } } : '/auth/signup')}
        />
        <TextButton label={t('auth.forgotPassword')} onPress={() => router.push('/auth/forgot')} />
      </FormScroll>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors, displayTitle }) => ({
  heading: { ...displayTitle, marginTop: 8 },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginBottom: 8 },
  error: { fontFamily: fonts.body, color: colors.danger },
}));
