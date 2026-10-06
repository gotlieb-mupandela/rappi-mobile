import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { usePhotoPicker } from '@/src/components/PhotoPicker';
import { Avatar } from '@/src/components/settings';
import { EmptyState, FormScroll, LabeledField, PrimaryButton, Screen } from '@/src/components/ui';
import { useAuth } from '@/src/lib/auth';
import { successHaptic } from '@/src/lib/haptics';
import { fetchProfile } from '@/src/lib/orders';
import { profileName, profilePhoto, saveFullName } from '@/src/lib/profile';
import { useToast } from '@/src/lib/toast';
import { makeStyles, useTheme } from '@/src/lib/theme';
import { fonts, radius } from '@/src/theme';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useStyles();
  const queryClient = useQueryClient();
  const toast = useToast();
  const photo = usePhotoPicker();
  const profile = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchProfile(user!.id),
  });
  const savedName = profileName(user, profile.data?.full_name);
  const [name, setName] = useState(savedName);
  const [edited, setEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!edited) setName(savedName);
  }, [edited, savedName]);

  if (!user) {
    return (
      <Screen title="Profile" back>
        <EmptyState icon="person-outline" message="Sign in to edit your profile." action="Sign in" onPress={() => router.replace('/auth/login')} />
      </Screen>
    );
  }

  const email = profile.data?.email || user.email || '';
  const trimmed = name.trim();
  const canSave = !busy && trimmed.length > 0 && trimmed !== savedName;

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await saveFullName(user.id, trimmed);
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEdited(false);
      successHaptic();
      toast.show('Profile saved', { icon: 'checkmark-circle' });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your name. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title="Profile" back>
      <FormScroll gap={18}>
        <View style={styles.photo}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            disabled={photo.busy}
            onPress={photo.open}
            style={({ pressed }) => pressed && styles.pressed}>
            <Avatar uri={profilePhoto(user)} name={savedName} email={email} size={112} />
            {photo.busy ? (
              <View style={styles.photoBusy}>
                <ActivityIndicator color={colors.onDark} />
              </View>
            ) : null}
          </Pressable>
          <Pressable accessibilityRole="button" disabled={photo.busy} onPress={photo.open} hitSlop={8}>
            <Text style={styles.photoAction}>{photo.busy ? 'Uploading…' : 'Change photo'}</Text>
          </Pressable>
        </View>

        <LabeledField
          label="Full name"
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          returnKeyType="done"
          value={name}
          onChangeText={(text) => {
            setEdited(true);
            setName(text);
          }}
          onSubmitEditing={() => canSave && save()}
        />
        <View style={styles.readOnly}>
          <Text style={styles.readOnlyLabel}>Email</Text>
          <Text style={styles.readOnlyValue}>{email}</Text>
          <Text style={styles.readOnlyHint}>Used to sign in and for order receipts.</Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={busy ? 'Saving…' : 'Save changes'} disabled={!canSave} onPress={save} />
      </FormScroll>
      {photo.sheet}
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  pressed: { opacity: 0.85 },
  photo: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  photoBusy: {
    ...StyleSheet.absoluteFill,
    borderRadius: 56,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAction: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.accentText },
  readOnly: { gap: 6, padding: 14, borderRadius: radius.input, backgroundColor: colors.elevated, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  readOnlyLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.text },
  readOnlyValue: { fontFamily: fonts.body, fontSize: 16, color: colors.text },
  readOnlyHint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger },
}));
