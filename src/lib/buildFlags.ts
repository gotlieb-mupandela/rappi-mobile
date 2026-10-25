/**
 * Build-time flags are booleans baked into app.config extra.flags.
 * Only a real boolean true counts. Strings, numbers, and other values stay off,
 * so a link, push payload, or typed value cannot turn a flag on.
 */
export function flagFromExtra(extra: unknown, name: string): boolean {
  if (!extra || typeof extra !== 'object') return false;
  const flags = (extra as { flags?: unknown }).flags;
  if (!flags || typeof flags !== 'object') return false;
  return (flags as Record<string, unknown>)[name] === true;
}
