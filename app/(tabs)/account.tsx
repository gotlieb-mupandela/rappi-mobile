import Ionicons from '@expo/vector-icons/Ionicons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { deleteAccount, openSitePage, openSupportEmail, openWhatsApp, SUPPORT_EMAIL, SUPPORT_WHATSAPP_LABEL } from '@/src/api/account';
import { ApiError, isNetworkError, isRouteMissing, NETWORK_MESSAGE } from '@/src/api/client';
import { usePhotoPicker } from '@/src/components/PhotoPicker';
import { ActionSheet, Avatar, SettingsGroup, SettingsRow } from '@/src/components/settings';
import { BrandMark, Field, PrimaryButton, Screen, SecondaryButton, SkeletonList } from '@/src/components/ui';
import { useAuth } from '@/src/lib/auth';
import { fetchProfile } from '@/src/lib/orders';
import { profileName, profilePhoto } from '@/src/lib/profile';
import { supabase } from '@/src/lib/supabase';
import { useWishlist } from '@/src/lib/wishlist';
import { colors, fonts, radius, space } from '@/src/theme';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const DELETE_PHRASE = 'Delete my Account';

function HelpAndLegal({ onContact }: { onContact: () => void }) {
  return (
    <SettingsGroup title="Help & legal">
      <SettingsRow icon="chatbubbles-outline" label="Contact us" detail="WhatsApp or email our team" onPress={onContact} />
      <SettingsRow icon="return-down-back-outline" label="Returns & refunds" external onPress={() => openSitePage('returns')} />
      <SettingsRow icon="document-text-outline" label="Terms & conditions" external onPress={() => openSitePage('terms')} />
      <SettingsRow icon="shield-checkmark-outline" label="Privacy policy" external onPress={() => openSitePage('privacy')} />
    </SettingsGroup>
  );
}

function ContactSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <ActionSheet
      visible={visible}
      title="Contact us"
      onClose={onClose}
      options={[
        { label: `WhatsApp ${SUPPORT_WHATSAPP_LABEL}`, icon: 'logo-whatsapp', onPress: openWhatsApp },
        { label: `Email ${SUPPORT_EMAIL}`, icon: 'mail-outline', onPress: openSupportEmail },
      ]}
    />
  );
}

function VersionFooter() {
  return <Text style={styles.version}>Rappi Sports Hub · Version {APP_VERSION}</Text>;
}

export default function AccountScreen() {
  const { user, ready } = useAuth();
  const wishlist = useWishlist();
  const queryClient = useQueryClient();
  const photo = usePhotoPicker();
  const [contactOpen, setContactOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePhrase, setDeletePhrase] = useState('');
  const phraseMatches = deletePhrase.trim().toLowerCase() === DELETE_PHRASE.toLowerCase();
  const profile = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchProfile(user!.id),
  });

  const clearAccountQueries = () => {
    queryClient.removeQueries({ queryKey: ['orders'] });
    queryClient.removeQueries({ queryKey: ['order'] });
    queryClient.removeQueries({ queryKey: ['profile'] });
  };

  const signOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setSignOutError("Couldn't sign out. Try again.");
        return;
      }
      clearAccountQueries();
    } catch {
      setSignOutError("Couldn't sign out. Try again.");
    } finally {
      setSigningOut(false);
    }
  };

  const confirmDelete = async () => {
    if (!phraseMatches) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
    } catch (err) {
      setDeleting(false);
      if (isRouteMissing(err)) {
        setDeleteError("Account deletion isn't available right now. Contact us through rappisportshub.com.");
      } else if (isNetworkError(err)) {
        setDeleteError(NETWORK_MESSAGE);
      } else {
        setDeleteError(err instanceof ApiError ? err.message : "Couldn't delete your account. Try again.");
      }
      return;
    }
    // The server session is already gone, so only the local session needs clearing.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
    clearAccountQueries();
    setDeleting(false);
    setConfirmingDelete(false);
    setDeletePhrase('');
  };

  const wishlistValue = wishlist.count ? `${wishlist.count} saved` : undefined;
  const contact = <ContactSheet visible={contactOpen} onClose={() => setContactOpen(false)} />;

  if (!ready) {
    return (
      <Screen title="Account">
        <SkeletonList count={4} />
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen title="Account">
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.guest}>
            <BrandMark height={84} />
            <Text style={styles.guestTitle}>Your Rappi account</Text>
            <Text style={styles.guestText}>Sign in to track orders, save your details and check out faster.</Text>
            <View style={styles.guestActions}>
              <PrimaryButton label="Sign in" onPress={() => router.push('/auth/login')} />
              <SecondaryButton label="Create account" onPress={() => router.push('/auth/signup')} />
            </View>
          </View>
          <SettingsGroup title="My shopping">
            <SettingsRow icon="heart-outline" label="Wishlist" value={wishlistValue} onPress={() => router.push('/wishlist')} />
          </SettingsGroup>
          <SettingsGroup title="Preferences">
            <SettingsRow icon="settings-outline" label="Settings" detail="Notifications and app preferences" onPress={() => router.push('/settings')} />
          </SettingsGroup>
          <HelpAndLegal onContact={() => setContactOpen(true)} />
          <VersionFooter />
        </ScrollView>
        {contact}
      </Screen>
    );
  }

  const fullName = profileName(user, profile.data?.full_name);
  const email = profile.data?.email || user.email || '';

  return (
    <Screen title="Account">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            disabled={photo.busy}
            onPress={photo.open}
            style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}>
            <Avatar uri={profilePhoto(user)} name={fullName} email={email} size={76} />
            <View style={styles.avatarBadge}>
              {photo.busy ? <ActivityIndicator size="small" color={colors.onDark} /> : <Ionicons name="camera" size={14} color={colors.onDark} />}
            </View>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {fullName || 'Your account'}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/profile')}
              hitSlop={8}
              style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
              <Text style={styles.editLabel}>Edit profile</Text>
            </Pressable>
          </View>
        </View>

        <SettingsGroup title="My shopping">
          <SettingsRow icon="receipt-outline" label="Orders" detail="Track and view past orders" onPress={() => router.push('/orders')} />
          <SettingsRow icon="heart-outline" label="Wishlist" value={wishlistValue} onPress={() => router.push('/wishlist')} />
        </SettingsGroup>

        <SettingsGroup title="Account">
          <SettingsRow icon="person-outline" label="Profile details" detail="Name and profile photo" onPress={() => router.push('/profile')} />
          <SettingsRow icon="lock-closed-outline" label="Change password" onPress={() => router.push('/settings/password')} />
          <SettingsRow icon="settings-outline" label="Settings" detail="Notifications and app preferences" onPress={() => router.push('/settings')} />
        </SettingsGroup>

        <HelpAndLegal onContact={() => setContactOpen(true)} />

        <SettingsGroup>
          <SettingsRow
            icon="log-out-outline"
            label={signingOut ? 'Signing out…' : 'Sign out'}
            disabled={signingOut || deleting}
            onPress={signOut}
          />
        </SettingsGroup>
        {signOutError ? <Text style={styles.error}>{signOutError}</Text> : null}

        {confirmingDelete ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmTitle}>Delete your account?</Text>
            <Text style={styles.confirmText}>
              This permanently deletes your account and the personal data linked to it. It can't be undone.
            </Text>
            <Text style={styles.confirmText}>
              To confirm, type <Text style={styles.confirmPhrase}>{DELETE_PHRASE}</Text> below.
            </Text>
            <Field
              accessibilityLabel={`Type ${DELETE_PHRASE} to confirm`}
              placeholder={DELETE_PHRASE}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              editable={!deleting}
              value={deletePhrase}
              onChangeText={setDeletePhrase}
              onSubmitEditing={() => !deleting && confirmDelete()}
            />
            {deleteError ? <Text style={styles.error}>{deleteError}</Text> : null}
            <PrimaryButton
              label={deleting ? 'Deleting…' : 'Delete permanently'}
              disabled={deleting || !phraseMatches}
              onPress={confirmDelete}
            />
            <SecondaryButton
              label="Cancel"
              disabled={deleting}
              onPress={() => {
                setConfirmingDelete(false);
                setDeleteError(null);
                setDeletePhrase('');
              }}
            />
          </View>
        ) : (
          <SettingsGroup>
            <SettingsRow
              icon="trash-outline"
              label="Delete account"
              detail="Permanently remove your account and data"
              danger
              disabled={signingOut}
              onPress={() => setConfirmingDelete(true)}
            />
          </SettingsGroup>
        )}

        <VersionFooter />
      </ScrollView>
      {photo.sheet}
      {contact}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.screen, gap: 24, paddingBottom: 48 },
  pressed: { opacity: 0.8 },
  guest: { alignItems: 'center', gap: 10, paddingTop: 8 },
  guestTitle: { marginTop: 6, fontFamily: fonts.displayBold, fontSize: 22, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.text },
  guestText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center', maxWidth: 300 },
  guestActions: { alignSelf: 'stretch', gap: 10, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: { position: 'relative' },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.text,
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.bodyBold, fontSize: 20, color: colors.text },
  email: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  editButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    height: 32,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  editLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, paddingHorizontal: 4 },
  confirm: {
    gap: 12,
    padding: 18,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.bg,
  },
  confirmTitle: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.danger },
  confirmText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  confirmPhrase: { fontFamily: fonts.bodyBold, color: colors.text },
  version: { textAlign: 'center', fontFamily: fonts.body, fontSize: 12, color: colors.muted },
});
