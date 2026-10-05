import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ApiError, isNetworkError, NETWORK_MESSAGE } from '@/src/api/client';
import { sendTeamQuote } from '@/src/api/quote';
import { FormScroll, LabeledField, PrimaryButton, Screen } from '@/src/components/ui';
import { colors, displayTitle, fonts } from '@/src/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TeamsScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [sport, setSport] = useState('Football');
  const [players, setPlayers] = useState('');
  const [sizes, setSizes] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const valid = !!name.trim() && EMAIL.test(email.trim()) && !!organisation.trim();

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await sendTeamQuote({
        name: name.trim(),
        email: email.trim(),
        organisation: organisation.trim(),
        sport: sport.trim(),
        players: players.trim(),
        sizes: sizes.trim(),
        notes: notes.trim(),
      });
      setSent(true);
    } catch (err) {
      if (isNetworkError(err)) setError(NETWORK_MESSAGE);
      else setError(err instanceof ApiError ? err.message : 'Could not send the request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Teams" back>
      <FormScroll>
        <Text style={styles.heading}>Team kit quote</Text>
        <Text style={styles.hint}>Tell us about your club or school. We’ll reply by email with a quote.</Text>
        {sent ? (
          <View style={styles.success}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={24} color={colors.onAccent} />
            </View>
            <Text style={styles.successTitle}>Request sent</Text>
            <Text style={styles.info}>We’ll reply by email.</Text>
            <View style={styles.done}>
              <PrimaryButton label="Done" onPress={() => router.back()} />
            </View>
          </View>
        ) : (
          <>
            <LabeledField label="Name" placeholder="Jane Doe" autoComplete="name" value={name} onChangeText={setName} />
            <LabeledField
              label="Email"
              placeholder="jane@example.com"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <LabeledField label="Organisation" placeholder="Windhoek High" value={organisation} onChangeText={setOrganisation} />
            <LabeledField label="Sport" placeholder="Football" value={sport} onChangeText={setSport} />
            <LabeledField
              label="Number of players"
              optional
              placeholder="18"
              keyboardType="number-pad"
              value={players}
              onChangeText={setPlayers}
            />
            <LabeledField
              label="Sizes"
              optional
              placeholder="Mostly M and L"
              value={sizes}
              onChangeText={setSizes}
            />
            <LabeledField
              label="Notes"
              optional
              placeholder="Anything else we should know?"
              value={notes}
              onChangeText={setNotes}
              multiline
              style={styles.notes}
              textAlignVertical="top"
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton label={busy ? 'Please wait' : 'Send request'} disabled={busy || !valid} onPress={submit} />
          </>
        )}
      </FormScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { ...displayTitle, marginTop: 8 },
  hint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted, marginBottom: 8 },
  notes: { height: 96, paddingTop: 12 },
  error: { fontFamily: fonts.body, color: colors.danger },
  success: { alignItems: 'center', paddingVertical: 36, gap: 10 },
  successIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontFamily: fonts.displayBold, fontSize: 22, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.text },
  info: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
  done: { alignSelf: 'stretch', marginTop: 14 },
});
