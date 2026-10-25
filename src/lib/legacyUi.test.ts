import assert from 'node:assert/strict';
import test from 'node:test';

import { legacyUiEnabled } from './legacyUi.ts';

const KEY = 'EXPO_PUBLIC_USE_LEGACY_UI';

function withValue(value: string | undefined, run: () => void) {
  const previous = process.env[KEY];
  if (value === undefined) delete process.env[KEY];
  else process.env[KEY] = value;
  try {
    run();
  } finally {
    if (previous === undefined) delete process.env[KEY];
    else process.env[KEY] = previous;
  }
}

test('legacy UI stays on until the flag is explicitly turned off', () => {
  withValue(undefined, () => assert.equal(legacyUiEnabled(), true));
  withValue('', () => assert.equal(legacyUiEnabled(), true));
  withValue('1', () => assert.equal(legacyUiEnabled(), true));
  withValue('true', () => assert.equal(legacyUiEnabled(), true));
  withValue('0', () => assert.equal(legacyUiEnabled(), false));
  withValue('false', () => assert.equal(legacyUiEnabled(), false));
});
