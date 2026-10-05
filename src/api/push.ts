import { apiFetch } from '@/src/api/client';

export async function subscribePush(expoToken: string, platform: 'android' | 'ios'): Promise<void> {
  await apiFetch('/api/push/subscribe', {
    method: 'POST',
    auth: true,
    body: { expoToken, platform },
    fallbackMessage: 'Could not register notifications.',
  });
}
