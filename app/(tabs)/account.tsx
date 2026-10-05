import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ListCard, PrimaryButton, Screen, SkeletonList, TextButton } from '@/src/components/ui';
import { useAuth } from '@/src/lib/auth';
import { fetchProfile } from '@/src/lib/orders';
import { supabase } from '@/src/lib/supabase';
import { colors, fonts, space } from '@/src/theme';

export default function AccountScreen() {
  const { user, ready } = useAuth();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const profile = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: () => fetchProfile(user!.id),
  });

  const signOut = async () => {
    setSigningOut(true);
    setSignOutError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setSignOutError("Couldn't sign out. Try again.");
        return;
      }
      queryClient.removeQueries({ queryKey: ['orders'] });
      queryClient.removeQueries({ queryKey: ['order'] });
      queryClient.removeQueries({ queryKey: ['profile'] });
    } catch {
      setSignOutError("Couldn't sign out. Try again.");
    } finally {
      setSigningOut(false);
    }
  };

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
        <View style={styles.guest}>
          <Text style={styles.mark}>RAPPI</Text>
          <Text style={styles.hint}>Sign in to track orders</Text>
          <View style={styles.guestActions}>
            <PrimaryButton label="Sign in" onPress={() => router.push('/auth/login')} />
          </View>
          <TextButton label="Create account" onPress={() => router.push('/auth/signup')} />
          <TextButton label="Team kit quote" muted onPress={() => router.push('/teams')} />
        </View>
      </Screen>
    );
  }

  const fullName = profile.data?.full_name || (user.user_metadata?.full_name as string | undefined);

  return (
    <Screen title="Account">
      <View style={styles.content}>
        {fullName ? <Text style={styles.name}>{fullName}</Text> : null}
        <Text style={fullName ? styles.email : styles.name}>{profile.data?.email || user.email}</Text>
        <View style={styles.list}>
          <ListCard title="Orders" onPress={() => router.push('/orders')} />
          <ListCard title="Wishlist" onPress={() => router.push('/wishlist')} />
          <ListCard title="Teams" subtitle="Quote for club and school kit" onPress={() => router.push('/teams')} />
          {signOutError ? <Text style={styles.error}>{signOutError}</Text> : null}
          <ListCard title={signingOut ? 'Signing out…' : 'Sign out'} danger disabled={signingOut} onPress={signOut} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  guest: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.screen, gap: 16 },
  guestActions: { alignSelf: 'stretch' },
  mark: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    letterSpacing: 3,
    color: colors.text,
  },
  hint: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
  content: { padding: space.screen, gap: 8 },
  name: { fontFamily: fonts.bodySemi, fontSize: 20, color: colors.text },
  email: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  list: { gap: 8, marginTop: 16 },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, paddingVertical: 4 },
});
