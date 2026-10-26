/**
 * Image hosts a storefront photo may use.
 * Rows 1-4 match web `lib/image-hosts.ts` `ALLOWED_IMAGE_HOSTS`
 * at the web revision recorded in data/web-pin.json.
 * The fifth row is the canonical site origin, every path, as a fixed app constant.
 * Hosts are never read from the feed.
 */

export type AllowedImageHost = {
  host: string;
  /** Path prefix on that host. "/" allows every path. */
  pathnamePrefix: string;
};

export const CANONICAL_IMAGE_ORIGIN = 'https://www.rappisportshub.com';

export const ALLOWED_IMAGE_HOSTS: readonly AllowedImageHost[] = [
  { host: 'wsrv.nl', pathnamePrefix: '/' },
  {
    host: 'wzmzwerzbyudcvoiiege.supabase.co',
    pathnamePrefix: '/storage/v1/object/public/product-images/',
  },
  { host: 'www.joma-sport.com', pathnamePrefix: '/on/demandware.static/' },
  { host: 'v1.joma-sport.net', pathnamePrefix: '/files/' },
  { host: 'www.rappisportshub.com', pathnamePrefix: '/' },
];

export function imageHostAllows(hostname: string, pathname: string, rule: AllowedImageHost): boolean {
  return hostname === rule.host && pathname.startsWith(rule.pathnamePrefix);
}

/** https URL on the allowlist, or null when the value must be dropped. Relative URLs are dropped. */
export function sanitizeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/') || trimmed.startsWith('\\')) return null;
  if (/^http:\/\//i.test(trimmed)) return null;
  if (!/^https:\/\//i.test(trimmed)) return null;
  if (trimmed.includes('\\') || /\s/.test(trimmed)) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (parsed.port !== '') return null;
  if (parsed.username || parsed.password) return null;
  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== parsed.hostname || hostname.endsWith('.') || hostname.includes('%')) return null;
  const allowed = ALLOWED_IMAGE_HOSTS.some((rule) => imageHostAllows(hostname, parsed.pathname, rule));
  if (!allowed) return null;
  return parsed.href;
}

/** Web calls this host check `feedImageUrl`. The app uses the same rules. */
export function feedImageUrl(value: unknown): string | null {
  return sanitizeImageUrl(value);
}
