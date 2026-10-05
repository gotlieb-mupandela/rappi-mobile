import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

const CHUNK = 1800;

// Chunked reads and writes for one key must not interleave, or a read can mix two sessions.
const queues = new Map<string, Promise<unknown>>();
function serial<T>(key: string, task: () => Promise<T>): Promise<T> {
  const run = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(task);
  queues.set(key, run);
  return run;
}

const ChunkedSecureStore = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return globalThis.localStorage?.getItem(key) ?? null;
    }
    const chunkCount = await SecureStore.getItemAsync(`${key}_chunks`);
    if (!chunkCount) {
      return SecureStore.getItemAsync(key);
    }
    const count = Number(chunkCount);
    if (!Number.isInteger(count) || count < 1) return null;
    const parts: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const part = await SecureStore.getItemAsync(`${key}_${i}`);
      if (part == null) return null;
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    const previousCount = Number((await SecureStore.getItemAsync(`${key}_chunks`)) ?? 0);
    const chunks = Math.max(1, Math.ceil(value.length / CHUNK));
    for (let i = 0; i < chunks; i += 1) {
      await SecureStore.setItemAsync(`${key}_${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK));
    }
    // Publish the new chunk count only after every chunk has been written.
    await SecureStore.setItemAsync(`${key}_chunks`, String(chunks));
    await SecureStore.deleteItemAsync(key);
    for (let i = chunks; i < previousCount; i += 1) {
      await SecureStore.deleteItemAsync(`${key}_${i}`);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    const chunkCount = await SecureStore.getItemAsync(`${key}_chunks`);
    const count = chunkCount ? Number(chunkCount) : 1;
    await SecureStore.deleteItemAsync(key);
    await SecureStore.deleteItemAsync(`${key}_chunks`);
    for (let i = 0; i < count; i += 1) {
      await SecureStore.deleteItemAsync(`${key}_${i}`);
    }
  },
};

const SecureStoreAdapter = {
  getItem: (key: string) => serial(key, () => ChunkedSecureStore.getItem(key)),
  setItem: (key: string, value: string) => serial(key, () => ChunkedSecureStore.setItem(key, value)),
  removeItem: (key: string) => serial(key, () => ChunkedSecureStore.removeItem(key)),
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!url || !anonKey) {
  throw new Error('Supabase public keys are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// React Native timers stall in the background, so refresh only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}
