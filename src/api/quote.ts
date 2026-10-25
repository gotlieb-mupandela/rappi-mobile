import { apiFetch } from '@/src/api/client';

export type TeamwearQuote = {
  name: string;
  email: string;
  organisation: string;
  sport?: string;
  players?: string;
  sizes?: string;
  notes?: string;
};

export function submitTeamwearQuote(quote: TeamwearQuote): Promise<unknown> {
  return apiFetch('/api/teamwear-quote', {
    method: 'POST',
    body: quote,
    fallbackMessage: 'Could not send the request. Try again.',
  });
}
