import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { FormScroll, LabeledField, PrimaryButton, Screen } from '@/src/components/ui';
import { successHaptic } from '@/src/lib/haptics';
import { authErrorMessage } from '@/src/lib/navigation';
import { supabase } from '@/src/lib/supabase';
import { useToast } from '@/src/lib/toast';
import { colors, fonts } from '@/src/theme';

const MIN_LENGTH = 6;

export default function ChangePasswordScreen() {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.updateUser({ password });
      if (authError) {
        setError(authErrorMessage(authError));
        return;
      }
      successHaptic();
      toast.show('Password updated', { icon: 'checkmark-circle' });
      router.back();
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Change password" back>
      <FormScroll gap={16}>
        <Text style={styles.hint}>
          Your password works in the app and on rappisportshub.com. Use at least {MIN_LENGTH} characters.
        </Text>
        <LabeledField
          label="New password"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          value={password}
          onChangeText={setPassword}
        />
        <LabeledField
          label="Confirm new password"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          value={confirm}
          onChangeText={setConfirm}
          onSubmitEditing={() => !busy && password.length >= MIN_LENGTH && confirm === password && submit()}
        />
        {tooShort ? <Text style={styles.error}>Use at least {MIN_LENGTH} characters.</Text> : null}
        {mismatch ? <Text style={styles.error}>The passwords don't match.</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          label={busy ? 'Saving…' : 'Update password'}
          disabled={busy || password.length < MIN_LENGTH || confirm !== password}
          onPress={submit}
        />
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
});
