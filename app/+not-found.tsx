import { router } from 'expo-router';

import { EmptyState, Screen } from '@/src/components/ui';

export default function NotFoundScreen() {
  return (
    <Screen title="Not found" back>
      <EmptyState message="That screen is not in the shop." action="Home" onPress={() => router.replace('/(tabs)')} />
    </Screen>
  );
}
