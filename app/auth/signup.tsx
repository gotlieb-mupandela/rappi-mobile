import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { GoogleButton, OrDivider } from '@/src/components/GoogleButton';
import { BrandMark, Field, FormScroll, PrimaryButton, Screen } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { authErrorMessage, finishAuth } from '@/src/lib/navigation';
import { supabase } from '@/src/lib/supabase';
import { makeStyles } from '@/src/lib/theme';
import { fonts } from '@/src/theme';

export default function SignupScreen() {
  const { t } = useLocale();
  const styles = useStyles();
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
        setInfo(t('auth.confirmEmail'));
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
    <Screen title={t('auth.createAccount')} back>
      <FormScroll>
        <BrandMark />
        <Text style={styles.heading}>{t('auth.join')}</Text>
        <Text style={styles.hint}>{t('auth.signupHint')}</Text>
        <GoogleButton returnTo={returnTo} />
        <OrDivider />
        <Field placeholder={t('auth.fullName')} autoComplete="name" textContentType="name" value={name} onChangeText={setName} />
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
          autoComplete="new-password"
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {info ? <Text style={styles.info}>{info}</Text> : null}
        <PrimaryButton
          label={busy ? t('auth.pleaseWait') : t('auth.createAccount')}
          disabled={busy || !email.trim() || !password || !name.trim()}
          onPress={submit}
        />
      </FormScroll>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors, displayTitle }) => ({
  heading: { ...displayTitle, marginTop: 8 },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, marginBottom: 8 },
  error: { fontFamily: fonts.body, color: colors.danger },
  info: { fontFamily: fonts.bodySemi, color: colors.accentText },
}));
