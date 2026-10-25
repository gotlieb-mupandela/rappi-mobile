import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ACCOUNT_DELETE_PAGE,
  accountDeletePhraseMatches,
  assertAccountDeleteUrl,
  buildAccountDeleteHandoff,
  openAccountDeletePage,
} from './accountDelete.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

test('builds a website handoff with no token and no session change', () => {
  const handoff = buildAccountDeleteHandoff();
  assert.equal(handoff.url, 'https://www.rappisportshub.com/account/delete');
  assert.equal(handoff.endsSession, false);
  assert.deepEqual(Object.keys(handoff).sort(), ['endsSession', 'url']);
  assert.equal(buildAccountDeleteHandoff.length, 0);
  const serialized = JSON.stringify(handoff);
  assert.equal(serialized.includes('Bearer'), false);
  assert.equal(serialized.includes('access_token'), false);
  assert.equal(serialized.includes('Authorization'), false);
  assert.equal(serialized.includes('/api/account'), false);
});

test('accepts only the exact delete page', () => {
  assert.equal(assertAccountDeleteUrl(ACCOUNT_DELETE_PAGE), ACCOUNT_DELETE_PAGE);
  const rejected = [
    'http://www.rappisportshub.com/account/delete',
    'https://rappisportshub.com/account/delete',
    'https://www.rappisportshub.com/api/account',
    'https://www.rappisportshub.com/api/account/delete',
    'https://www.rappisportshub.com/account/delete?token=abc',
    'https://www.rappisportshub.com/account/delete#access_token=abc',
    'https://user:secret@www.rappisportshub.com/account/delete',
    'https://www.rappisportshub.com:443/account/delete',
    'https://www.rappisportshub.com/account/delete/',
    'https://www.rappisportshub.com/account/delete/../delete',
    'https://www.rappisportshub.com.evil.com/account/delete',
    'https://evil.com/account/delete',
    'https://www.rappisportshub.com/account/delete ',
  ];
  for (const url of rejected) {
    assert.throws(() => assertAccountDeleteUrl(url), /not available/);
  }
});

test('opens the in-app browser with only the exact page', async () => {
  const calls: string[] = [];
  await openAccountDeletePage(
    async (url) => {
      calls.push(url);
    },
    async () => {
      throw new Error('system browser should stay closed');
    },
  );
  assert.deepEqual(calls, [ACCOUNT_DELETE_PAGE]);
});

test('uses the system browser when the in-app browser cannot open', async () => {
  const calls: string[] = [];
  await openAccountDeletePage(
    async () => {
      calls.push('in-app');
      throw new Error('in-app browser missing');
    },
    async (url) => {
      calls.push(url);
    },
  );
  assert.deepEqual(calls, ['in-app', ACCOUNT_DELETE_PAGE]);
});

test('failure stays a fixed message with no opener detail', async () => {
  await assert.rejects(
    openAccountDeletePage(
      async () => {
        throw new Error('Bearer secret-token');
      },
      async () => {
        throw new Error('https://evil.example/?token=abc');
      },
    ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, 'Could not open the account deletion page.');
      assert.equal(error.message.includes('Bearer'), false);
      assert.equal(error.message.includes('token'), false);
      return true;
    },
  );
});

test('confirmation phrase must match and cannot be empty', () => {
  assert.equal(accountDeletePhraseMatches('Delete my Account', 'Delete my Account'), true);
  assert.equal(accountDeletePhraseMatches('  delete my account  ', 'Delete my Account'), true);
  assert.equal(accountDeletePhraseMatches('Supprimer mon compte', 'Supprimer mon compte'), true);
  assert.equal(accountDeletePhraseMatches('Delete my Account', 'Supprimer mon compte'), false);
  assert.equal(accountDeletePhraseMatches('', ''), false);
  assert.equal(accountDeletePhraseMatches('   ', '   '), false);
  assert.equal(accountDeletePhraseMatches('Delete my Account', ''), false);
});

test('the app client does not call a delete endpoint', () => {
  const accountApi = readFileSync(join(repoRoot, 'src/api/account.ts'), 'utf8');
  const accountScreen = readFileSync(join(repoRoot, 'app/(tabs)/account.tsx'), 'utf8');
  for (const source of [accountApi, accountScreen]) {
    assert.equal(source.includes("'/api/account"), false);
    assert.equal(source.includes('"/api/account'), false);
    assert.equal(source.includes('Authorization'), false);
    assert.equal(source.includes('access_token'), false);
    assert.equal(source.includes('Bearer'), false);
  }
  assert.equal(accountApi.includes('openAccountDeletePage'), true);
  assert.equal(accountApi.includes('apiFetch'), false);
  assert.equal(accountScreen.includes('openAccountDeletion'), true);
  assert.equal(accountScreen.includes('signOut({ scope'), false);
  assert.equal(accountScreen.includes('err.message'), false);
});
