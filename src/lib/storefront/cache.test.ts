import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { memoryStore, resolveStorefront, storeHostAllowed } from './cache.ts';

function fixture(): unknown {
  return JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8'));
}

const host = 'https://www.rappisportshub.com';

test('a malformed feed keeps the last good copy', async () => {
  const store = memoryStore();
  const good = fixture();
  const first = await resolveStorefront({
    production: false,
    apiUrl: host,
    store,
    fetchFeed: async () => good,
  });
  assert.equal(first?.version, '2026-10-25.1.7');
  let calls = 0;
  const second = await resolveStorefront({
    production: true,
    apiUrl: host,
    store,
    fetchFeed: async () => {
      calls += 1;
      return { version: 'broken' };
    },
  });
  assert.equal(calls, 1);
  assert.equal(second?.version, '2026-10-25.1.7');
  const thrown = await resolveStorefront({
    production: true,
    apiUrl: host,
    store,
    fetchFeed: async () => {
      throw new Error('offline');
    },
  });
  assert.equal(thrown?.version, '2026-10-25.1.7');
});

test('a bad checkout country keeps the last good copy', async () => {
  const store = memoryStore();
  const good = fixture();
  const first = await resolveStorefront({
    production: false,
    apiUrl: host,
    store,
    fetchFeed: async () => good,
  });
  assert.equal(first?.version, '2026-10-25.1.7');
  const bad = structuredClone(good) as { version: string; checkout: { countries: Array<{ vatRate: number }> } };
  bad.version = 'bad-country';
  bad.checkout.countries[0].vatRate = 1.5;
  const second = await resolveStorefront({
    production: false,
    apiUrl: host,
    store,
    fetchFeed: async () => bad,
  });
  assert.equal(second?.version, '2026-10-25.1.7');
  const missing = await resolveStorefront({
    production: false,
    apiUrl: host,
    store: memoryStore(),
    fetchFeed: async () => bad,
  });
  assert.equal(missing, null);
});

test('no cache and a failed fetch returns null so the screen can show retry', async () => {
  const empty = await resolveStorefront({
    production: false,
    apiUrl: host,
    store: memoryStore(),
    fetchFeed: async () => {
      throw new Error('offline');
    },
  });
  assert.equal(empty, null);
});

test('production builds refuse a store host other than www.rappisportshub.com', async () => {
  let called = false;
  const result = await resolveStorefront({
    production: true,
    apiUrl: 'https://preview.example',
    store: memoryStore(),
    fetchFeed: async () => {
      called = true;
      return fixture();
    },
  });
  assert.equal(called, false);
  assert.equal(result, null);
  assert.equal(storeHostAllowed('https://www.rappisportshub.com', true), true);
  assert.equal(storeHostAllowed('http://www.rappisportshub.com', false), false);
  assert.equal(storeHostAllowed('https://preview.example', false), true);
});
