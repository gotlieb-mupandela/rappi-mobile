import { validateMobileStorefront } from './contract.ts';
import type { MobileStorefront } from './types.ts';

/** Public storefront route. No other URL is fetched for the snapshot. */
export const SNAPSHOT_URL = 'https://www.rappisportshub.com/api/mobile/v1/storefront';

export const SNAPSHOT_GENERATED = 'GENERATED, do not edit';

/**
 * AWAITING GOTLIEB'S OK: not wired into any EAS or release build until he approves.
 * The release bundle does not embed a snapshot. A missing file stays null.
 */
export async function readApprovedSnapshot(): Promise<unknown | null> {
  return null;
}

/**
 * Reads a generated snapshot through validateMobileStorefront, the same contract as a live feed.
 * Image hosts are checked inside that contract by feedImageUrl.
 */
export function acceptSnapshot(value: unknown): MobileStorefront | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (record.generated !== SNAPSHOT_GENERATED) return null;
  if (record.sourceUrl !== SNAPSHOT_URL) return null;
  if (typeof record.fetchedAt !== 'string' || record.fetchedAt.trim() === '') return null;
  const parsed = validateMobileStorefront(record.feed);
  if (!parsed.ok) return null;
  if (record.sourceVersion !== parsed.value.version) return null;
  return parsed.value;
}
