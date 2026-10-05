import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { subscribePush } from '@/src/api/push';
import { supabase } from '@/src/lib/supabase';

const ASKED_KEY = 'pushAsked';
const REGISTERED_KEY = 'pushRegistered';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
}

/** Called from the payment result screen. Prompts at most once per install. */
export async function askAndRegisterPush(): Promise<void> {
  const asked = await AsyncStorage.getItem(ASKED_KEY);
  await registerPushIfNeeded(!asked);
}

/** Never prompts unless `ask` is true; otherwise only registers when permission is already granted. */
export async function registerPushIfNeeded(ask = false): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) return;
    if (!Device.isDevice || Platform.OS === 'web') return;
    const id = projectId();
    if (!id) return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Orders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && ask) {
      const permission = await Notifications.requestPermissionsAsync();
      status = permission.status;
      await AsyncStorage.setItem(ASKED_KEY, '1');
    } else if (ask) {
      await AsyncStorage.setItem(ASKED_KEY, '1');
    }
    if (status !== 'granted') return;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
    const marker = `${userId}:${token}`;
    if ((await AsyncStorage.getItem(REGISTERED_KEY)) === marker) return;
    await subscribePush(token, Platform.OS === 'ios' ? 'ios' : 'android');
    await AsyncStorage.setItem(REGISTERED_KEY, marker);
  } catch {
    // Push is best effort; the next sign-in or payment retries.
  }
}

export function forgetPushRegistration(): Promise<void> {
  return AsyncStorage.removeItem(REGISTERED_KEY);
}

function openOrderFrom(response: Notifications.NotificationResponse | null): void {
  const orderId = response?.notification.request.content.data?.orderId;
  if ((typeof orderId === 'string' && orderId) || typeof orderId === 'number') {
    router.push(`/orders/${orderId}`);
  }
}

export function listenForPushOpens(): () => void {
  if (Platform.OS === 'web') return () => undefined;
  void Notifications.getLastNotificationResponseAsync().then(openOrderFrom);
  const sub = Notifications.addNotificationResponseReceivedListener(openOrderFrom);
  return () => sub.remove();
}
