import { apiFetch } from '@/src/api/client';
import type { QuoteBody } from '@/src/api/types';

export async function sendTeamQuote(body: QuoteBody): Promise<void> {
  await apiFetch<{ ok: true }>('/api/teamwear-quote', {
    method: 'POST',
    body,
    fallbackMessage: 'Could not send the request.',
  });
}
