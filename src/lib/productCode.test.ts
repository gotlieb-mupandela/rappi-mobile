import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { createClient } from '@supabase/supabase-js';

import { productCodeFromRoute } from './storefront/contract.ts';

const ROOT = new URL('../../', import.meta.url);

function readRepo(relative: string): string {
  return readFileSync(new URL(relative, ROOT), 'utf8');
}

function walk(dir: string, out: string[]) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'generated') continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(path);
  }
}

test('the product route decodes once and an invalid code is not fetched', () => {
  const calls: string[] = [];
  const fetchIfValid = (raw: string | undefined) => {
    const code = productCodeFromRoute(raw);
    if (!code) return null;
    calls.push(code);
    return code;
  };

  assert.equal(fetchIfValid('709%2F101'), '709/101');
  assert.equal(fetchIfValid('TEAM%2F14'), 'TEAM/14');
  assert.equal(fetchIfValid('946%2C001'), '946,001');
  assert.equal(fetchIfValid('%252e%252e'), null);
  assert.equal(fetchIfValid('709%252F101'), null);
  assert.equal(fetchIfValid('%2e%2e%2f'), null);
  assert.equal(fetchIfValid('%'), null);
  assert.equal(fetchIfValid(undefined), null);
  assert.deepEqual(calls, ['709/101', 'TEAM/14', '946,001']);

  const screen = readRepo('app/product/[code].tsx');
  assert.equal(screen.includes('decodeURIComponent'), false);
  assert.equal(screen.split('productCodeFromRoute(').length - 1, 1);
  assert.match(screen, /enabled: code !== null/);
  assert.match(screen, /if \(!code\) return;/);
  assert.match(screen, /if \(!code\) return Promise\.reject/);
});

test('product links use object params or a single encode', () => {
  const roots = [new URL('./src', ROOT).pathname, new URL('./app', ROOT).pathname];
  const files: string[] = [];
  for (const root of roots) walk(root, files);

  const rawProductPath = /\/product(?:s)?\/\$\{(?!encodeURIComponent\()/;
  const stringPush = /router\.(?:push|replace|navigate)\(\s*[`'"]\/product\//;
  const hrefString = /href=\{\s*[`'"]\/product\//;
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.equal(rawProductPath.test(text), false, file);
    assert.equal(stringPush.test(text), false, file);
    assert.equal(hrefString.test(text), false, file);
  }

  for (const relative of ['src/components/ProductCard.tsx', 'app/wishlist.tsx']) {
    const text = readRepo(relative);
    assert.match(text, /pathname: '\/product\/\[code\]'/);
    assert.match(text, /params: \{ code: product\.code \}/);
    assert.equal(text.includes('encodeURIComponent'), false, relative);
  }

  const productApi = readRepo('src/api/product.ts');
  assert.equal(productApi.split('encodeURIComponent(code)').length - 1, 1);
  assert.match(productApi, /`\/api\/products\/\$\{encodeURIComponent\(code\)\}`/);

  const catalog = readRepo('src/api/catalog.ts');
  assert.match(catalog, /new URLSearchParams/);
  assert.match(catalog, /search\.set\('q', params\.q\)/);
  assert.equal(/\$\{params\.q\}/.test(catalog), false);
});

test('postgrest in() quotes a product code that contains a comma', async () => {
  const urls: string[] = [];
  const client = createClient('https://example.supabase.co', 'public-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (input) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        urls.push(url);
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      },
    },
  });
  const { error } = await client.from('products').select('id, code').in('code', ['946,001', '709/101']);
  assert.equal(error, null);
  assert.equal(urls.length, 1);
  const decoded = decodeURIComponent(urls[0]);
  assert.match(decoded, /code=in\.\("946,001"/);
});
