import * as Network from 'expo-network';
import { onlineManager } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { makeStyles } from '@/src/lib/theme';
import { fonts, space } from '@/src/theme';

const OfflineContext = createContext(false);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = (state: Network.NetworkState) => {
      const nextOffline = state.isConnected === false || state.isInternetReachable === false;
      setOffline(nextOffline);
      onlineManager.setOnline(!nextOffline);
    };

    void Network.getNetworkStateAsync().then(update).catch(() => {
      setOffline(false);
      onlineManager.setOnline(true);
    });
    const subscription = Network.addNetworkStateListener(update);
    return () => {
      subscription.remove();
    };
  }, []);

  return <OfflineContext.Provider value={offline}>{children}</OfflineContext.Provider>;
}

export function useOffline(): boolean {
  return useContext(OfflineContext);
}

export function OfflineBanner() {
  const styles = useStyles();
  const offline = useOffline();
  if (!offline) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>You’re offline</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  banner: {
    backgroundColor: colors.elevated,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: space.screen,
    paddingVertical: 8,
  },
  text: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
}));
