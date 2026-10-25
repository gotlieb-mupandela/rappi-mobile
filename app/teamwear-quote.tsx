import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { ApiError, isNetworkError, NETWORK_MESSAGE } from '@/src/api/client';
import { submitTeamwearQuote } from '@/src/api/quote';
import { FormScroll, LabeledField, PrimaryButton, Screen, TextButton } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { legacyUiEnabled } from '@/src/lib/legacyUi';
import { makeStyles, useTheme } from '@/src/lib/theme';
import { fonts } from '@/src/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TeamwearQuoteRoute() {
  if (legacyUiEnabled()) return <Redirect href="/(tabs)/account" />;
  return <TeamwearQuoteScreen />;
}

function TeamwearQuoteScreen() {
  const { t } = useLocale();
  const { sectionLabel } = useTheme();
  const styles = useStyles();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [sport, setSport] = useState('');
  const [players, setPlayers] = useState('');
  const [sizes, setSizes] = useState('');
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (!name.trim() || !EMAIL.test(email.trim()) || !organisation.trim()) {
      setError(t('quote.invalid'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      await submitTeamwearQuote({
        name: name.trim(),
        email: email.trim(),
        organisation: organisation.trim(),
        sport: sport.trim() || undefined,
        players: players.trim() || undefined,
        sizes: sizes.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSent(true);
    } catch (err) {
      if (isNetworkError(err)) setError(NETWORK_MESSAGE);
      else setError(err instanceof ApiError ? err.message : t('quote.failed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen title={t('quote.title')} back>
      {sent ? (
        <FormScroll>
          <Text style={styles.title}>{t('quote.thanksTitle')}</Text>
          <Text style={styles.body}>{t('quote.thanksBody')}</Text>
          <TextButton
            label={t('quote.another')}
            onPress={() => {
              setSent(false);
              setNotes('');
            }}
          />
        </FormScroll>
      ) : (
        <FormScroll>
          <Text style={styles.body}>{t('quote.intro')}</Text>
          <Text style={sectionLabel}>{t('quote.whatInclude')}</Text>
          <Text style={styles.body}>{t('quote.includeOrg')}</Text>
          <Text style={styles.body}>{t('quote.includeSport')}</Text>
          <Text style={styles.body}>{t('quote.includeSizes')}</Text>
          <Text style={styles.body}>{t('quote.includeKit')}</Text>
          <LabeledField label={t('quote.name')} value={name} onChangeText={setName} autoComplete="name" />
          <LabeledField
            label={t('quote.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
          <LabeledField label={t('quote.organisation')} value={organisation} onChangeText={setOrganisation} placeholder={t('quote.organisationPh')} />
          <LabeledField label={t('quote.sport')} value={sport} onChangeText={setSport} placeholder={t('quote.sportPh')} />
          <LabeledField label={t('quote.players')} value={players} onChangeText={setPlayers} placeholder={t('quote.playersPh')} />
          <LabeledField label={t('quote.sizes')} value={sizes} onChangeText={setSizes} placeholder={t('quote.sizesPh')} />
          <LabeledField
            label={t('quote.notes')}
            value={notes}
            onChangeText={setNotes}
            placeholder={t('quote.notesPh')}
            multiline
            style={styles.notes}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton label={sending ? t('quote.sending') : t('quote.submit')} disabled={sending} onPress={() => void send()} />
          <Text style={styles.body}>{t('quote.replyHint')}</Text>
        </FormScroll>
      )}
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  title: { fontFamily: fonts.bodySemi, fontSize: 18, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted },
  notes: { height: 96, paddingTop: 12, textAlignVertical: 'top' },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
}));
