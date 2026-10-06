import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet } from 'react-native';

import { openSitePage } from '@/src/api/account';
import { ActionSheet, SettingsGroup, SettingsRow, SettingsSwitchRow } from '@/src/components/settings';
import { Screen } from '@/src/components/ui';
import { useLocale } from '@/src/i18n/LocaleProvider';
import { MARKETS } from '@/src/i18n/market';
import { useAuth } from '@/src/lib/auth';
import { hapticsSupported, setHapticsEnabled, tapHaptic, useHapticsEnabled } from '@/src/lib/haptics';
import { enableNotifications, useNotificationState } from '@/src/lib/push';
import { space } from '@/src/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

function openSystemSettings() {
  void Linking.openSettings().catch(() => undefined);
}

export default function SettingsScreen() {
  const { market, setMarket, t } = useLocale();
  const { user } = useAuth();
  const [marketOpen, setMarketOpen] = useState(false);
  const haptics = useHapticsEnabled();
  const [notifications, refreshNotifications] = useNotificationState();

  const toggleNotifications = async (next: boolean) => {
    // Apps can't revoke their own permission, so turning off (or a blocked prompt) goes to system settings.
    if (!next || notifications === 'blocked') {
      openSystemSettings();
      return;
    }
    const state = await enableNotifications();
    if (state === 'blocked') openSystemSettings();
    refreshNotifications();
  };

  const notificationFooter =
    notifications === 'blocked'
      ? "Notifications are blocked for Rappi Sport. Tap the switch to open your phone's settings and allow them."
      : user
        ? "We'll only notify you about your orders. You can change this anytime in your phone's settings."
        : 'Sign in to get updates about your orders on this phone.';

  return (
    <Screen title={t('settings.title')} back>
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsGroup title={t('settings.preferences')}>
          <SettingsRow
            icon="language-outline"
            label={t('settings.languageCurrency')}
            value={MARKETS[market].label}
            onPress={() => setMarketOpen(true)}
          />
        </SettingsGroup>

        <SettingsGroup title="Notifications" footer={notificationFooter}>
          <SettingsSwitchRow
            icon="notifications-outline"
            label="Push notifications"
            detail="Order confirmations, shipping and delivery updates"
            value={notifications === 'on'}
            disabled={notifications === null || notifications === 'unsupported'}
            onChange={(next) => void toggleNotifications(next)}
          />
          <SettingsRow icon="phone-portrait-outline" label="Phone notification settings" onPress={openSystemSettings} />
        </SettingsGroup>

        {hapticsSupported ? (
          <SettingsGroup title="Preferences">
            <SettingsSwitchRow
              icon="pulse-outline"
              label="Vibration"
              detail="Light vibration when you tap buttons"
              value={haptics}
              onChange={(next) => {
                setHapticsEnabled(next);
                if (next) tapHaptic();
              }}
            />
          </SettingsGroup>
        ) : null}

        {user ? (
          <SettingsGroup title="Security">
            <SettingsRow icon="lock-closed-outline" label="Change password" onPress={() => router.push('/settings/password')} />
          </SettingsGroup>
        ) : null}

        <SettingsGroup title="About">
          <SettingsRow icon="information-circle-outline" label="App version" value={APP_VERSION} />
          <SettingsRow icon="document-text-outline" label="Terms & conditions" external onPress={() => openSitePage('terms')} />
          <SettingsRow icon="shield-checkmark-outline" label="Privacy policy" external onPress={() => openSitePage('privacy')} />
        </SettingsGroup>
      </ScrollView>
      <ActionSheet
        visible={marketOpen}
        title={t('market.title')}
        onClose={() => setMarketOpen(false)}
        options={[
          { label: MARKETS.na.label, icon: market === 'na' ? 'checkmark-circle' : 'ellipse-outline', onPress: () => void setMarket('na') },
          { label: MARKETS.eu.label, icon: market === 'eu' ? 'checkmark-circle' : 'ellipse-outline', onPress: () => void setMarket('eu') },
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.screen, gap: 24, paddingBottom: 48 },
});
