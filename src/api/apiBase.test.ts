import assert from 'node:assert/strict';
import test from 'node:test';

import { API_BASE_MISSING, API_BASE_REJECTED, resolveApiBase } from './apiBase.ts';

test('production accepts only https on the store hosts', () => {
  assert.deepEqual(resolveApiBase('https://www.rappisportshub.com', true), {
    ok: true,
    base: 'https://www.rappisportshub.com',
  });
  assert.deepEqual(resolveApiBase('https://rappisportshub.com/', true), {
    ok: true,
    base: 'https://rappisportshub.com',
  });
  assert.deepEqual(resolveApiBase('https://WWW.RAPPISPORTSHUB.COM', true), {
    ok: true,
    base: 'https://WWW.RAPPISPORTSHUB.COM',
  });
  assert.deepEqual(resolveApiBase('https://user:secret@www.rappisportshub.com', true), {
    ok: true,
    base: 'https://user:secret@www.rappisportshub.com',
  });
});

test('production rejects other schemes, hosts, and lookalikes', () => {
  const rejected = [
    'http://www.rappisportshub.com',
    'http://rappisportshub.com',
    'https://www.rappisportshub.com.evil.com',
    'https://rappisportshub.com.evil.com',
    'https://evilexample.com',
    'https://shop.rappisportshub.com',
    'https://www.rappisportshub.com@evil.com',
    'https://rappisportshub.com@evil.com/api',
    'https://good.com@evil.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://192.168.1.20:3000',
    'http://10.0.2.2:8081',
    'not a url',
  ];
  for (const url of rejected) {
    const result = resolveApiBase(url, true);
    assert.deepEqual(result, { ok: false, message: API_BASE_REJECTED }, url);
  }
});

test('production rejects a missing store URL', () => {
  assert.deepEqual(resolveApiBase(undefined, true), { ok: false, message: API_BASE_MISSING });
  assert.deepEqual(resolveApiBase('   ', true), { ok: false, message: API_BASE_MISSING });
});

test('development keeps any local host, including Metro, localhost, and LAN addresses', () => {
  const hosts = [
    'http://localhost:8081',
    'http://127.0.0.1:3000',
    'http://192.168.1.20:3000',
    'http://10.0.2.2:8081',
    'http://10.0.0.8:3000/',
    'https://evil.example',
  ];
  for (const url of hosts) {
    const result = resolveApiBase(url, false);
    assert.equal(result.ok, true, url);
    if (result.ok) assert.equal(result.base, url.replace(/\/+$/, ''));
  }
});

test('development still rejects a missing store URL', () => {
  assert.deepEqual(resolveApiBase('', false), { ok: false, message: API_BASE_MISSING });
  assert.deepEqual(resolveApiBase(undefined, false), { ok: false, message: API_BASE_MISSING });
});
