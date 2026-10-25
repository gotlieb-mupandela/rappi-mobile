import assert from 'node:assert/strict';
import test from 'node:test';

import type { PersistedClient } from '@tanstack/query-persist-client-core';

import {
  QUERY_CACHE_KEY,
  createPublicCatalogPersister,
  persistedClientWithoutPersonalData,
  shouldPersistQuery,
} from './queryPersistence.ts';

const order = {
  queryKey: ['orders', 'user-1'],
  state: { data: { email: 'shopper@example.com', phone: '081000000', address: '12 Independence Ave' } },
};

test('persists public catalog queries only', () => {
  assert.equal(shouldPersistQuery(['catalog', 'running']), true);
  assert.equal(shouldPersistQuery(['product', 'ABC']), true);
  assert.equal(shouldPersistQuery(['hub-athlete', 'running', 'jane']), true);
  assert.equal(shouldPersistQuery(['orders', 'user-1']), false);
  assert.equal(shouldPersistQuery(['order', 'order-1']), false);
  assert.equal(shouldPersistQuery(['profile', 'user-1']), false);
  assert.equal(shouldPersistQuery(['stock', 'ABC']), false);
  assert.equal(shouldPersistQuery([]), false);
  assert.equal(shouldPersistQuery([1]), false);
});

test('strips orders, profile and mutations from a restored cache', () => {
  const stripped = persistedClientWithoutPersonalData({
    timestamp: 1,
    buster: '1.0.0',
    clientState: {
      mutations: [{ mutationKey: ['checkout'] }],
      queries: [
        order,
        { queryKey: ['profile', 'user-1'], state: { data: { email: 'shopper@example.com', full_name: 'A B' } } },
        { queryKey: ['order', 'order-1'], state: { data: { phone: '081000000', address: '12 Independence Ave' } } },
        { queryKey: ['catalog', 'shoes'], state: { data: { name: 'Shoes' } } },
      ],
    },
  } as unknown as PersistedClient);

  assert.deepEqual(
    stripped.clientState.queries.map((query) => query.queryKey),
    [['catalog', 'shoes']],
  );
  assert.deepEqual(stripped.clientState.mutations, []);
  assert.equal(JSON.stringify(stripped).includes('shopper@example.com'), false);
  assert.equal(JSON.stringify(stripped).includes('081000000'), false);
});

test('does not write personal order fields to storage', async () => {
  const saved = new Map<string, string>();
  const persister = createPublicCatalogPersister(
    {
      getItem: async (key) => saved.get(key) ?? null,
      setItem: async (key, value) => {
        saved.set(key, value);
      },
      removeItem: async (key) => {
        saved.delete(key);
      },
    },
    0,
  );

  await persister.persistClient({
    timestamp: 1,
    buster: '1.0.0:public-catalog',
    clientState: {
      mutations: [],
      queries: [order, { queryKey: ['product', 'ABC'], state: { data: { name: 'Shirt' } } }],
    },
  } as unknown as PersistedClient);

  const raw = saved.get(QUERY_CACHE_KEY) ?? '';
  assert.equal(raw.includes('shopper@example.com'), false);
  assert.equal(raw.includes('081000000'), false);
  assert.equal(raw.includes('12 Independence Ave'), false);
  assert.equal(raw.includes('Shirt'), true);

  saved.set(
    QUERY_CACHE_KEY,
    JSON.stringify({
      timestamp: 1,
      buster: '1.0.0:public-catalog',
      clientState: { mutations: [{ mutationKey: ['pay'] }], queries: [order] },
    }),
  );
  const restored = await persister.restoreClient();
  assert.equal(restored?.clientState.queries.length, 0);
  assert.equal(restored?.clientState.mutations.length, 0);
});
