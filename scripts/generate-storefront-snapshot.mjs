/**
 * AWAITING GOTLIEB'S OK: not wired into any EAS or release build until he approves.
 * GENERATED output. Do not edit the snapshot file by hand.
 *
 * Fetches only the public GET https://www.rappisportshub.com/api/mobile/v1/storefront
 * No keys, tokens, or cookies are read or sent.
 *
 * Run by hand:
 * node --experimental-strip-types --import ./scripts/register-tsx.mjs scripts/generate-storefront-snapshot.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SNAPSHOT_URL = 'https://www.rappisportshub.com/api/mobile/v1/storefront';
export const SNAPSHOT_HOST = 'www.rappisportshub.com';
export const SNAPSHOT_GENERATED = 'GENERATED, do not edit';

/**
 * @param {(url: string) => Promise<{ ok?: boolean, json: () => Promise<unknown> }>} [fetchImpl]
 * @returns {Promise<unknown>}
 */
export async function fetchStorefrontDocument(fetchImpl) {
  const fetchFn = fetchImpl ?? globalThis.fetch;
  const response = await fetchFn(SNAPSHOT_URL, { redirect: 'error' });
  if (!response || !response.ok) throw new Error('Storefront fetch failed');
  if (typeof response.url !== 'string' || response.url.length === 0) {
    throw new Error('Storefront fetch host mismatch');
  }
  const finalUrl = new URL(response.url);
  if (finalUrl.protocol !== 'https:' || finalUrl.host !== SNAPSHOT_HOST) {
    throw new Error('Storefront fetch host mismatch');
  }
  return response.json();
}

export function snapshotEnvelope(feed, fetchedAt) {
  const sourceVersion = feed && typeof feed === 'object' && typeof feed.version === 'string' ? feed.version : null;
  return {
    generated: SNAPSHOT_GENERATED,
    sourceUrl: SNAPSHOT_URL,
    fetchedAt,
    sourceVersion,
    feed,
  };
}

export const SNAPSHOT_PATH = fileURLToPath(new URL('../src/lib/storefront/generated/storefront-snapshot.json', import.meta.url));

async function main() {
  const { acceptSnapshot } = await import('../src/lib/storefront/snapshot.ts');
  const fetchedAt = new Date().toISOString();
  const feed = await fetchStorefrontDocument();
  const envelope = snapshotEnvelope(feed, fetchedAt);
  if (!acceptSnapshot(envelope)) throw new Error('Storefront snapshot failed validation');
  mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
  writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(envelope, null, 2)}\n`);
  process.stdout.write(`Wrote ${join('src/lib/storefront/generated', 'storefront-snapshot.json')}\n`);
}

const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entry && import.meta.url === entry) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Snapshot failed'}\n`);
    process.exitCode = 1;
  });
}
