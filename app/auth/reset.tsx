import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { BrandMark, Field, FormScroll, PrimaryButton, Screen } from '@/src/components/ui';
import { authErrorMessage, finishAuth } from '@/src/lib/navigation';
import { supabase } from '@/src/lib/supabase';
import { makeStyles } from '@/src/lib/theme';
import { fonts } from '@/src/theme';

function linkParams(url: string): URLSearchParams {
  const hash = url.split('#')[1] ?? '';
  const query = url.split('#')[0].split('?')[1] ?? '';
  return new URLSearchParams(hash || query);
}

export default function ResetScreen() {
  const url = Linking.useURL();
  const styles = useStyles();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const params = url ? linkParams(url) : new URLSearchParams();
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const code = params.get('code');
      const linkError = params.get('error_description');
      if (linkError) {
        if (active) setError(linkError.replace(/\+/g, ' '));
        return;
      }
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (!active) return;
        if (sessionError) setError(authErrorMessage(sessionError));
        else setReady(true);
        return;
      }
      if (code) {
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
        if (!active) return;
        if (codeError) setError(authErrorMessage(codeError));
        else setReady(true);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) setReady(true);
      else if (url) setError('This reset link has expired. Request a new one.');
    })();
    return () => {
      active = false;
    };
  }, [url]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) {
        setError(authErrorMessage(authError));
        return;
      }
      finishAuth();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="New password" back>
      <FormScroll>
        <BrandMark />
        <Text style={styles.hint}>Choose a new password for your Rappi account.</Text>
        <Field
          placeholder="New password"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={busy ? 'Please wait' : 'Save password'} disabled={!ready || busy || password.length < 6} onPress={submit} />
      </FormScroll>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  hint: { fontFamily: fonts.body, color: colors.muted },
  error: { fontFamily: fonts.body, color: colors.danger },
}));
