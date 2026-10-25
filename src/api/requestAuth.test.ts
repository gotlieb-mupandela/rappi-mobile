import assert from 'node:assert/strict';
import test from 'node:test';

import { DELETE_ACCOUNT_AUTH, DELETE_ACCOUNT_METHOD, DELETE_ACCOUNT_PATH, bearerAuthorization } from './requestAuth.ts';

test('delete account calls DELETE /api/account with the session access token', () => {
  const accessToken = 'supabase-session-access-token';
  assert.equal(DELETE_ACCOUNT_PATH, '/api/account');
  assert.equal(DELETE_ACCOUNT_METHOD, 'DELETE');
  assert.equal(DELETE_ACCOUNT_AUTH, true);
  assert.equal(DELETE_ACCOUNT_PATH.endsWith('/delete'), false);
  assert.equal(bearerAuthorization(accessToken), `Bearer ${accessToken}`);
});
