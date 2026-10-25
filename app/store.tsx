import { Redirect, router } from 'expo-router';
import { ScrollView, Text } from 'react-native';

import { openSupportEmail, openWhatsApp } from '@/src/api/account';
import { PrimaryButton, Screen, SecondaryButton } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { legacyUiEnabled } from '@/src/lib/legacyUi';
import { makeStyles, useTheme } from '@/src/lib/theme';
import { fonts, space } from '@/src/theme';

export default function StoreRoute() {
  if (legacyUiEnabled()) return <Redirect href="/(tabs)/account" />;
  return <StoreScreen />;
}

function StoreScreen() {
  const { t } = useLocale();
  const { sectionLabel } = useTheme();
  const styles = useStyles();
  return (
    <Screen title={t('store.title')} back>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>{t('store.intro')}</Text>
        <Text style={sectionLabel}>{t('store.pickupTitle')}</Text>
        <Text style={styles.body}>{t('store.pickupBody')}</Text>
        <PrimaryButton label={t('store.pickupCta')} onPress={() => router.push('/checkout')} />
        <SecondaryButton label={t('quote.title')} onPress={() => router.push('/teamwear-quote')} />
        <Text style={[sectionLabel, styles.gap]}>{t('store.contactTitle')}</Text>
        <Text style={styles.body}>{t('store.contactBody')}</Text>
        <PrimaryButton label={t('store.email')} onPress={() => openSupportEmail(t('store.emailSubject'))} />
        <SecondaryButton label={t('store.whatsapp')} onPress={() => openWhatsApp(t('store.whatsappPrefill'))} />
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  content: { padding: space.screen, gap: 12, paddingBottom: 40 },
  intro: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted },
  gap: { marginTop: 8 },
}));
