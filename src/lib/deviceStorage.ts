import AsyncStorage from '@react-native-async-storage/async-storage';

export async function readStoredJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function createQueuedJsonWriter(key: string): (value: unknown) => void {
  let pending = Promise.resolve();
  return (value: unknown) => {
    const serialized = JSON.stringify(value);
    pending = pending
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(key, serialized))
      .catch(() => undefined);
  };
}
