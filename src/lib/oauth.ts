import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export const OAUTH_REDIRECT = 'rappisport://auth/callback';

function readParams(url: string): URLSearchParams {
  const params = new URLSearchParams();
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.split('?')[1] ?? '';
  for (const part of [query, hash]) {
    new URLSearchParams(part).forEach((value, key) => params.set(key, value));
  }
  return params;
}

/** Resolves true once signed in, false if the user closed the browser. */
export async function signInWithGoogle(): Promise<boolean> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: OAUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT);
  if (result.type !== 'success') return false;

  const params = readParams(result.url);
  const failure = params.get('error_description') ?? params.get('error');
  if (failure) throw new Error(failure.replace(/\+/g, ' '));

  const code = params.get('code');
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (code) {
    const { error: codeError } = await supabase.auth.exchangeCodeForSession(code);
    if (codeError) throw codeError;
  } else if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) throw sessionError;
  } else {
    throw new Error('Google sign-in did not finish. Try again.');
  }
  return true;
}
