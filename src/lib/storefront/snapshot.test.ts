import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { memoryStore, resolveStorefront } from './cache.ts';
import { validateMobileStorefront } from './contract.ts';
import { feedImageUrl } from './images.ts';
import { acceptSnapshot, readApprovedSnapshot, SNAPSHOT_GENERATED, SNAPSHOT_URL } from './snapshot.ts';
import { fetchStorefrontDocument, snapshotEnvelope } from '../../../scripts/generate-storefront-snapshot.mjs';

function fixture(): Record<string, unknown> {
  return JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8'));
}

const host = 'https://www.rappisportshub.com';

test('the snapshot generator fetches only the public storefront route and records the feed version', async () => {
  const calls: string[] = [];
  const body = fixture();
  const fetched = await fetchStorefrontDocument(function capture(url: string, ...extra: unknown[]) {
    assert.deepEqual(extra, []);
    calls.push(url);
    return Promise.resolve({ ok: true, json: async () => body });
  });
  assert.deepEqual(calls, [SNAPSHOT_URL]);
  const envelope = snapshotEnvelope(fetched, '2026-10-26T03:00:00.000Z');
  assert.equal(envelope.generated, SNAPSHOT_GENERATED);
  assert.equal(envelope.generated, 'GENERATED, do not edit');
  assert.equal(envelope.sourceUrl, SNAPSHOT_URL);
  assert.equal(envelope.fetchedAt, '2026-10-26T03:00:00.000Z');
  assert.equal(envelope.sourceVersion, '2026-10-25.1.7');
  const accepted = acceptSnapshot(envelope);
  assert.equal(accepted?.version, '2026-10-25.1.7');
});

test('a snapshot with a bad host image or a bad shape is rejected like a live feed', () => {
  const badImage = fixture();
  const nodes = badImage.nodes as { key: string; image: string | null }[];
  const kids = nodes.find((item) => item.key === 'children');
  assert.ok(kids);
  kids.image = 'https://evil.example/photo.jpg';
  const live = validateMobileStorefront(badImage);
  const snapshot = acceptSnapshot(snapshotEnvelope(badImage, '2026-10-26T03:00:00.000Z'));
  assert.equal(live.ok, true);
  if (!live.ok) return;
  assert.equal(feedImageUrl('https://evil.example/photo.jpg'), null);
  assert.equal(live.value.nodes.find((item) => item.key === 'children')?.image, null);
  assert.equal(snapshot?.nodes.find((item) => item.key === 'children')?.image, null);

  const badShape = { version: 'not-a-feed' };
  assert.equal(validateMobileStorefront(badShape).ok, false);
  assert.equal(acceptSnapshot(snapshotEnvelope(badShape, '2026-10-26T03:00:00.000Z')), null);
});

test('a bad feed keeps the last good copy and a missing snapshot stays empty', async () => {
  const store = memoryStore();
  const good = fixture();
  await resolveStorefront({
    enabled: true,
    production: false,
    apiUrl: host,
    store,
    fetchFeed: async () => good,
  });
  let snapshotReads = 0;
  const kept = await resolveStorefront({
    enabled: true,
    production: true,
    apiUrl: host,
    store,
    fetchFeed: async () => {
      throw new Error('offline');
    },
    readSnapshot: async () => {
      snapshotReads += 1;
      return snapshotEnvelope(fixture(), '2026-10-26T03:00:00.000Z');
    },
  });
  assert.equal(snapshotReads, 0);
  assert.equal(kept?.version, '2026-10-25.1.7');

  const offline = await resolveStorefront({
    enabled: true,
    production: true,
    apiUrl: host,
    store: memoryStore(),
    fetchFeed: async () => {
      throw new Error('offline');
    },
    readSnapshot: async () => snapshotEnvelope(good, '2026-10-26T03:00:00.000Z'),
  });
  assert.equal(offline?.version, '2026-10-25.1.7');

  const absent = await resolveStorefront({
    enabled: true,
    production: true,
    apiUrl: host,
    store: memoryStore(),
    fetchFeed: async () => {
      throw new Error('offline');
    },
    readSnapshot: async () => null,
  });
  assert.equal(absent, null);
  assert.equal(await readApprovedSnapshot(), null);
});
