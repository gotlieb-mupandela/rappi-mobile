import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { BrandMark, Field, FormScroll, PrimaryButton, Screen } from '@/src/components/ui';
import { AUTH_LINK_REJECTED, readAuthCallback } from '@/src/lib/authCallback';
import { authErrorMessage, finishAuth } from '@/src/lib/navigation';
import { supabase } from '@/src/lib/supabase';
import { makeStyles } from '@/src/lib/theme';
import { fonts } from '@/src/theme';

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
      const callback = readAuthCallback(url);
      if (callback.kind === 'rejected') {
        if (active) setError(AUTH_LINK_REJECTED);
        return;
      }
      if (callback.kind === 'code') {
        const { error: codeError } = await supabase.auth.exchangeCodeForSession(callback.code);
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
