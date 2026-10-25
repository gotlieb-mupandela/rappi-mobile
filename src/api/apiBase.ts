export const API_BASE_MISSING = 'Store URL is not configured.';
export const API_BASE_REJECTED = 'Store URL must be https on rappisportshub.com.';

/** Production builds may send the bearer token only to these exact hosts. */
export const PRODUCTION_API_HOSTS = ['www.rappisportshub.com', 'rappisportshub.com'] as const;

export type ApiBaseResult = { ok: true; base: string } | { ok: false; message: string };

function hostAllowed(hostname: string): boolean {
  for (const host of PRODUCTION_API_HOSTS) {
    if (hostname === host) return true;
  }
  return false;
}

/**
 * Production builds (`production` true) accept only https on the store hosts.
 * Development builds accept any configured host, including localhost and LAN addresses.
 */
export function resolveApiBase(raw: string | undefined, production: boolean): ApiBaseResult {
  const base = (raw ?? '').trim().replace(/\/+$/, '');
  if (!base) return { ok: false, message: API_BASE_MISSING };
  if (!production) return { ok: true, base };

  let parsed: URL;
  try {
    parsed = new URL(base);
  } catch {
    return { ok: false, message: API_BASE_REJECTED };
  }
  if (parsed.protocol === 'https:' && hostAllowed(parsed.hostname)) {
    return { ok: true, base };
  }
  return { ok: false, message: API_BASE_REJECTED };
}
