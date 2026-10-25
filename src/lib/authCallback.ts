/** Result of an auth redirect. Tokens in the URL are never returned. */
export type AuthCallback = { kind: 'code'; code: string } | { kind: 'rejected' } | { kind: 'none' };

export const AUTH_LINK_REJECTED = "This link can't be used. Request a new one.";

function linkParams(url: string): URLSearchParams {
  const hash = url.split('#')[1] ?? '';
  const beforeHash = url.split('#')[0] ?? '';
  const query = beforeHash.split('?')[1] ?? '';
  const params = new URLSearchParams();
  for (const part of [query, hash]) {
    new URLSearchParams(part).forEach((value, key) => {
      if (!params.has(key)) params.set(key, value);
    });
  }
  return params;
}

/**
 * Reads a PKCE `code` from a reset or OAuth redirect.
 * Access and refresh tokens are refused so another app that registers the
 * custom scheme cannot sign this app into a session it captured.
 */
export function readAuthCallback(url: string | null | undefined): AuthCallback {
  if (!url) return { kind: 'none' };
  const params = linkParams(url);
  const code = params.get('code')?.trim() ?? '';
  if (code) return { kind: 'code', code };
  const hasTokens = Boolean(params.get('access_token') || params.get('refresh_token'));
  const hasError = Boolean(params.get('error') || params.get('error_description'));
  if (hasTokens || hasError) return { kind: 'rejected' };
  return { kind: 'none' };
}
