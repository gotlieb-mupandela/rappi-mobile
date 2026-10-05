import 'react-native-gesture-handler';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Oswald_600SemiBold } from '@expo-google-fonts/oswald/600SemiBold';
import { Oswald_700Bold } from '@expo-google-fonts/oswald/700Bold';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { TabBar } from '@/src/components/TabBar';

import { AuthProvider } from '@/src/lib/auth';
import { BagProvider } from '@/src/lib/bag';
import { OfflineProvider } from '@/src/lib/offline';
import { listenForPushOpens } from '@/src/lib/push';
import { supabase } from '@/src/lib/supabase';
import { ToastProvider } from '@/src/lib/toast';
import { WishlistProvider } from '@/src/lib/wishlist';
import { colors } from '@/src/theme';
import { ApiError } from '@/src/api/client';

SplashScreen.preventAutoHideAsync();

export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);
  return (
    <View style={crash.wrap}>
      <Text style={crash.title}>SOMETHING WENT WRONG</Text>
      <Text style={crash.body}>The app hit an unexpected problem. Your bag and sign-in are safe.</Text>
      <Pressable accessibilityRole="button" onPress={retry} style={({ pressed }) => [crash.button, pressed && { opacity: 0.85 }]}>
        <Text style={crash.buttonLabel}>TRY AGAIN</Text>
      </Pressable>
    </View>
  );
}

const crash = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14, backgroundColor: colors.bg },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: 1, color: colors.text, textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', maxWidth: 300 },
  button: { marginTop: 8, height: 52, paddingHorizontal: 32, borderRadius: 999, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { fontSize: 14, fontWeight: '700', letterSpacing: 1, color: colors.onAccent },
});

function AboveTabBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaInsetsContext.Provider value={{ ...insets, bottom: 0 }}>{children}</SafeAreaInsetsContext.Provider>
    </View>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) =>
              failureCount < 1 &&
              (!(error instanceof ApiError) || error.status === 0 || error.status >= 500),
            staleTime: 60_000,
            refetchOnReconnect: true,
            refetchOnWindowFocus: true,
          },
          mutations: { retry: false },
        },
      }),
  );
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Oswald_600SemiBold,
    Oswald_700Bold,
  });

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => listenForPushOpens(), []);

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (AppState.currentState === 'active') {
      supabase.auth.startAutoRefresh();
    }
    const subscription = AppState.addEventListener('change', (state) => {
      const active = state === 'active';
      focusManager.setFocused(active);
      if (active) supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    return () => {
      subscription.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BagProvider>
              <WishlistProvider>
                <OfflineProvider>
                  <ToastProvider>
                    <StatusBar style="dark" />
                    <View style={{ flex: 1, backgroundColor: colors.bg }}>
                      <AboveTabBar>
                        <Stack
                          screenOptions={{
                            headerShown: false,
                            animation: reduceMotion ? 'none' : 'slide_from_right',
                            contentStyle: { backgroundColor: colors.bg },
                          }}>
                          <Stack.Screen name="(tabs)" />
                          <Stack.Screen name="checkout/result" options={{ gestureEnabled: false }} />
                        </Stack>
                      </AboveTabBar>
                      <TabBar />
                    </View>
                  </ToastProvider>
                </OfflineProvider>
              </WishlistProvider>
            </BagProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
