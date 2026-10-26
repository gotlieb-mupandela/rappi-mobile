/**
 * Build-time and runtime switch. Off unless the value is exactly "1" or "true".
 * Expo inlines EXPO_PUBLIC_DATA_DRIVEN_STOREFRONT. DATA_DRIVEN_STOREFRONT is read too
 * so a Node test or a runtime shell can set the same name.
 */
export function dataDrivenStorefrontEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const raw = env.DATA_DRIVEN_STOREFRONT ?? env.EXPO_PUBLIC_DATA_DRIVEN_STOREFRONT ?? '';
  return raw === '1' || raw === 'true';
}
