import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
const STORAGE_KEY = 'hapticsOff';

let enabled = supported;
const listeners = new Set<(on: boolean) => void>();

void AsyncStorage.getItem(STORAGE_KEY)
  .then((value) => {
    if (value === '1') setEnabled(false);
  })
  .catch(() => undefined);

function setEnabled(on: boolean): void {
  enabled = supported && on;
  listeners.forEach((listener) => listener(enabled));
}

export function setHapticsEnabled(on: boolean): void {
  setEnabled(on);
  void (on ? AsyncStorage.removeItem(STORAGE_KEY) : AsyncStorage.setItem(STORAGE_KEY, '1')).catch(() => undefined);
}

export function useHapticsEnabled(): boolean {
  const [on, setOn] = useState(enabled);
  useEffect(() => {
    setOn(enabled);
    listeners.add(setOn);
    return () => {
      listeners.delete(setOn);
    };
  }, []);
  return on;
}

export const hapticsSupported = supported;

export function tapHaptic(): void {
  if (!enabled) return;
  void Haptics.selectionAsync().catch(() => undefined);
}

export function pressHaptic(): void {
  if (!enabled) return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export function successHaptic(): void {
  if (!enabled) return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
