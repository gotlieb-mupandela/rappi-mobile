/**
 * Keeps the screens that shipped before website parity.
 *
 * Unset, `1`, or `true` (the default) is the current app.
 * `0` or `false` turns on storefront pictures and the website flows
 * (teamwear quote, promotions, store, about, invoice download, search).
 *
 * Gotlieb reverts by setting `EXPO_PUBLIC_USE_LEGACY_UI=1`, or deleting the
 * variable, and restarting Metro or rebuilding the dev client. No git revert.
 */
export function legacyUiEnabled(): boolean {
  const value = process.env.EXPO_PUBLIC_USE_LEGACY_UI?.trim().toLowerCase();
  return value !== '0' && value !== 'false';
}
