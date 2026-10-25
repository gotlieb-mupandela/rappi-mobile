import { Redirect } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { openSupportEmail, SUPPORT_EMAIL, SUPPORT_WHATSAPP_LABEL } from '@/src/api/account';
import { Screen, TextButton } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { legacyUiEnabled } from '@/src/lib/legacyUi';
import { makeStyles, useTheme } from '@/src/lib/theme';
import { fonts, space } from '@/src/theme';

const OFFERS = [
  'about.offerTeamwear',
  'about.offerSportswear',
  'about.offerFootwear',
  'about.offerBalls',
  'about.offerKits',
  'about.offerPacks',
] as const;

export default function AboutRoute() {
  if (legacyUiEnabled()) return <Redirect href="/(tabs)/account" />;
  return <AboutScreen />;
}

function AboutScreen() {
  const { t } = useLocale();
  const { sectionLabel } = useTheme();
  const styles = useStyles();
  return (
    <Screen title={t('about.title')} back>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>{t('about.intro')}</Text>
        <Text style={sectionLabel}>{t('about.whoTitle')}</Text>
        <Text style={styles.body}>
          {t('about.whoBody', {
            name: 'Rappi Sports Hub',
            legal: 'Rappi Investments CC',
            number: 'CC/2025/02866',
            city: 'Windhoek',
            country: 'Namibia',
          })}
        </Text>
        <Text style={sectionLabel}>{t('about.offerTitle')}</Text>
        <View style={styles.list}>
          {OFFERS.map((key) => (
            <Text key={key} style={styles.body}>
              {t(key)}
            </Text>
          ))}
        </View>
        <Text style={sectionLabel}>{t('about.serveTitle')}</Text>
        <Text style={styles.body}>{t('about.serveBody')}</Text>
        <Text style={sectionLabel}>{t('about.contactTitle')}</Text>
        <Text style={styles.body}>{t('about.contactBody')}</Text>
        <TextButton label={`${t('about.emailLabel')} ${SUPPORT_EMAIL}`} onPress={() => openSupportEmail()} />
        <Text style={styles.body}>
          {t('about.phoneLabel')} {SUPPORT_WHATSAPP_LABEL}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  content: { padding: space.screen, gap: 12, paddingBottom: 40 },
  intro: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted },
  list: { gap: 4 },
}));
