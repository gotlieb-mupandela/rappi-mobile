import type { AuthError } from '@supabase/supabase-js';
import { router } from 'expo-router';

export function authErrorMessage(error: AuthError | Error | unknown): string {
  const name = (error as { name?: string })?.name;
  const status = (error as { status?: number })?.status;
  if (name === 'AuthRetryableFetchError' || status === 0 || error instanceof TypeError) {
    return "Can't reach the store. Try again.";
  }
  const message = (error as { message?: string })?.message;
  return message || "Can't reach the store. Try again.";
}

export function openLogin(returnTo?: string): void {
  const safeReturnTo = internalPath(returnTo);
  router.push(safeReturnTo ? { pathname: '/auth/login', params: { returnTo: safeReturnTo } } : '/auth/login');
}

/** Leaves the auth screens and goes to `returnTo`, or the Account tab. */
export function finishAuth(returnTo?: string): void {
  const safeReturnTo = internalPath(returnTo);
  if (router.canDismiss()) router.dismissAll();
  if (safeReturnTo) {
    router.push(safeReturnTo as never);
  } else {
    router.navigate('/(tabs)/account');
  }
}

function internalPath(path?: string): string | undefined {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('://')) return undefined;
  return path;
}
