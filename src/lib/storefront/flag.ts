/**
 * The feed path is the default for this build. No flag has to be turned on.
 * Set STOREFRONT_ROLLBACK or EXPO_PUBLIC_STOREFRONT_ROLLBACK to "1" or "true"
 * to render catalog photos and prices again. Any other value keeps the feed.
 * Expo inlines EXPO_PUBLIC_STOREFRONT_ROLLBACK at build time.
 */
export function storefrontRollbackEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const raw = env.STOREFRONT_ROLLBACK ?? env.EXPO_PUBLIC_STOREFRONT_ROLLBACK ?? '';
  return raw === '1' || raw === 'true';
}

export function feedPathEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return !storefrontRollbackEnabled(env);
}
