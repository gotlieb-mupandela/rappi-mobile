import assert from 'node:assert/strict';
import test from 'node:test';

process.env.EXPO_PUBLIC_API_URL = 'https://shop.example';
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key';

const FIVE = ['709/101', '711/101', '946,001', '946,003', 'TEAM/14'];
const FIVE_QUERY = 'code=709%2F101&code=711%2F101&code=946%2C001&code=946%2C003&code=TEAM%2F14';

type FetchStock = (codes: string[]) => Promise<{ stock: Record<string, { available: boolean; sizes: { size: string; stock: number }[] }> }>;

async function loadFetchStock(): Promise<FetchStock> {
  const mod = await import('./stock.ts');
  return mod.fetchStock;
}

function installFetch() {
  const urls: string[] = [];
  const previous = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    urls.push(url);
    const codes = new URL(url).searchParams.getAll('code');
    const stock = Object.fromEntries(codes.map((code) => [code, { available: true, sizes: [{ size: code, stock: 1 }] }]));
    return new Response(JSON.stringify({ stock }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  return {
    urls,
    restore() {
      globalThis.fetch = previous;
    },
  };
}

function assertPlainCodeQuery(url: string) {
  assert.equal(url.includes('codes='), false);
  assert.equal(url.includes('%25'), false);
  assert.equal(url.includes(','), false);
}

test('stock requests one encoded code param per product', async () => {
  const fetchStock = await loadFetchStock();
  const capture = installFetch();
  try {
    const result = await fetchStock(FIVE);
    assert.equal(capture.urls.length, 1);
    assert.equal(new URL(capture.urls[0]).search.slice(1), FIVE_QUERY);
    assertPlainCodeQuery(capture.urls[0]);
    assert.deepEqual(Object.keys(result.stock), FIVE);
    assert.equal(result.stock['946,001'].sizes[0].size, '946,001');
  } finally {
    capture.restore();
  }
});

test('stock requests collapse duplicates and never send an invalid code', async () => {
  const fetchStock = await loadFetchStock();
  const capture = installFetch();
  try {
    const duplicated = await fetchStock(['709/101', '709/101', ' 709/101 ', '  TEAM/14  ']);
    assert.equal(capture.urls.length, 1);
    assert.equal(new URL(capture.urls[0]).search.slice(1), 'code=709%2F101&code=TEAM%2F14');
    assertPlainCodeQuery(capture.urls[0]);
    assert.deepEqual(Object.keys(duplicated.stock), ['709/101', 'TEAM/14']);

    const skipped = await fetchStock(['../etc/passwd', 'a//b', 'a/', 'a,,', '  ', '']);
    assert.deepEqual(skipped, { stock: {} });
    assert.equal(capture.urls.length, 1);

    const mixed = await fetchStock(['../etc/passwd', '946,001', 'x?admin=1']);
    assert.equal(capture.urls.length, 2);
    assert.equal(new URL(capture.urls[1]).search.slice(1), 'code=946%2C001');
    assertPlainCodeQuery(capture.urls[1]);
    assert.equal(mixed.stock['946,001'].available, true);
    assert.equal(capture.urls[1].includes('passwd'), false);
  } finally {
    capture.restore();
  }
});

test('51 stock codes are two requests of at most 50 and the stock maps merge', async () => {
  const fetchStock = await loadFetchStock();
  const codes = Array.from({ length: 51 }, (_, index) => `K${String(index + 1).padStart(2, '0')}`);
  const capture = installFetch();
  try {
    const result = await fetchStock(codes);
    assert.equal(capture.urls.length, 2);
    const first = new URL(capture.urls[0]).searchParams.getAll('code');
    const second = new URL(capture.urls[1]).searchParams.getAll('code');
    assert.equal(first.length, 50);
    assert.deepEqual(first, codes.slice(0, 50));
    assert.deepEqual(second, ['K51']);
    assertPlainCodeQuery(capture.urls[0]);
    assertPlainCodeQuery(capture.urls[1]);
    assert.equal(Object.keys(result.stock).length, 51);
    assert.equal(result.stock.K01.sizes[0].size, 'K01');
    assert.equal(result.stock.K51.sizes[0].size, 'K51');
  } finally {
    capture.restore();
  }
});
