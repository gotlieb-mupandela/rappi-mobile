import assert from 'node:assert/strict';
import test from 'node:test';

import { AUTH_LINK_REJECTED, readAuthCallback } from './authCallback.ts';

const ACCESS = 'eyJhbGciOiJIUzI1NiJ9.payload.signature';
const REFRESH = 'refresh-token-value';

test('reads a PKCE code from the query or the hash', () => {
  assert.deepEqual(readAuthCallback('rappisport://auth/reset?code=abc123'), { kind: 'code', code: 'abc123' });
  assert.deepEqual(readAuthCallback('rappisport://auth/callback#code=from-hash'), { kind: 'code', code: 'from-hash' });
});

test('prefers a code when a link also carries tokens', () => {
  const result = readAuthCallback(`rappisport://auth/callback?code=only-this#access_token=${ACCESS}&refresh_token=${REFRESH}`);
  assert.deepEqual(result, { kind: 'code', code: 'only-this' });
  assert.equal(JSON.stringify(result).includes(ACCESS), false);
});

test('rejects implicit tokens instead of returning them', () => {
  const result = readAuthCallback(`rappisport://auth/reset#access_token=${ACCESS}&refresh_token=${REFRESH}`);
  assert.deepEqual(result, { kind: 'rejected' });
  assert.equal(JSON.stringify(result).includes(ACCESS), false);
  assert.equal(JSON.stringify(result).includes(REFRESH), false);
  assert.equal(AUTH_LINK_REJECTED.includes(ACCESS), false);
});

test('rejects an error from the link without echoing its text', () => {
  const planted = 'Send your password to attacker.example';
  const result = readAuthCallback(`rappisport://auth/reset?error_description=${encodeURIComponent(planted)}`);
  assert.deepEqual(result, { kind: 'rejected' });
  assert.equal(AUTH_LINK_REJECTED.includes(planted), false);
  assert.equal(JSON.stringify(result).includes(planted), false);
});

test('returns none when the link has no auth params', () => {
  assert.deepEqual(readAuthCallback(null), { kind: 'none' });
  assert.deepEqual(readAuthCallback('rappisport://auth/reset'), { kind: 'none' });
});
