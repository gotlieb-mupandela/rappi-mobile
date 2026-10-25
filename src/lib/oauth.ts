import * as WebBrowser from 'expo-web-browser';

import { readAuthCallback } from '@/src/lib/authCallback';
import { supabase } from '@/src/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export const OAUTH_REDIRECT = 'rappisport://auth/callback';

/** Resolves true once signed in, false if the user closed the browser. */
export async function signInWithGoogle(): Promise<boolean> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: OAUTH_REDIRECT, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT);
  if (result.type !== 'success') return false;

  const callback = readAuthCallback(result.url);
  if (callback.kind !== 'code') {
    throw new Error('Google sign-in did not finish. Try again.');
  }
  const { error: codeError } = await supabase.auth.exchangeCodeForSession(callback.code);
  if (codeError) throw codeError;
  return true;
}
