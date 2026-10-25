import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { isOn, parseFlag, resolveFlag } from './flags.ts';

const FLAG_ENV = {
  PARITY_STOREFRONT: 'EXPO_PUBLIC_PARITY_STOREFRONT',
  PARITY_CARD_IMAGE: 'EXPO_PUBLIC_PARITY_CARD_IMAGE',
  HIDE_EUR_MARKET: 'EXPO_PUBLIC_HIDE_EUR_MARKET',
} as const;

const flagModuleUrl = new URL('./flags.ts', import.meta.url).href;

function runFlags(overrides: Record<string, string | undefined>) {
  const env = { ...process.env };
  for (const name of Object.values(FLAG_ENV)) delete env[name];
  for (const [name, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[name];
    else env[name] = value;
  }

  const script = `
    import { isOn } from ${JSON.stringify(flagModuleUrl)};
    const read = () => ({
      PARITY_STOREFRONT: isOn('PARITY_STOREFRONT'),
      PARITY_CARD_IMAGE: isOn('PARITY_CARD_IMAGE'),
      HIDE_EUR_MARKET: isOn('HIDE_EUR_MARKET'),
    });
    const before = read();
    process.env.EXPO_PUBLIC_PARITY_STOREFRONT = 'true';
    process.env.EXPO_PUBLIC_PARITY_CARD_IMAGE = 'true';
    process.env.EXPO_PUBLIC_HIDE_EUR_MARKET = 'true';
    const after = read();
    process.stdout.write(JSON.stringify({ before, after }));
  `;

  const result = spawnSync(
    process.execPath,
    ['--no-warnings', '--experimental-strip-types', '--input-type=module', '--eval', script],
    { env, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout) as {
    before: Record<keyof typeof FLAG_ENV, boolean>;
    after: Record<keyof typeof FLAG_ENV, boolean>;
  };
}

test('flags default off', () => {
  const loaded = runFlags({});
  assert.deepEqual(loaded.before, {
    PARITY_STOREFRONT: false,
    PARITY_CARD_IMAGE: false,
    HIDE_EUR_MARKET: false,
  });
  assert.deepEqual(loaded.after, loaded.before);
  assert.equal(isOn('PARITY_STOREFRONT'), false);
  assert.equal(isOn('PARITY_CARD_IMAGE'), false);
  assert.equal(isOn('HIDE_EUR_MARKET'), false);
});

test('env override is parsed when the module loads and then stays fixed', () => {
  const loaded = runFlags({
    [FLAG_ENV.PARITY_STOREFRONT]: 'true',
    [FLAG_ENV.PARITY_CARD_IMAGE]: '1',
    [FLAG_ENV.HIDE_EUR_MARKET]: ' yes ',
  });
  assert.deepEqual(loaded.before, {
    PARITY_STOREFRONT: true,
    PARITY_CARD_IMAGE: true,
    HIDE_EUR_MARKET: true,
  });
  assert.deepEqual(loaded.after, loaded.before);
});

test('unknown override values stay off', () => {
  const loaded = runFlags({
    [FLAG_ENV.PARITY_STOREFRONT]: 'maybe',
    [FLAG_ENV.PARITY_CARD_IMAGE]: '2',
    [FLAG_ENV.HIDE_EUR_MARKET]: 'enabled',
  });
  assert.deepEqual(loaded.before, {
    PARITY_STOREFRONT: false,
    PARITY_CARD_IMAGE: false,
    HIDE_EUR_MARKET: false,
  });
});

test('parseFlag accepts only explicit on tokens', () => {
  for (const value of [true, '1', 'true', 'TRUE', 'on', 'yes', ' Yes ']) {
    assert.equal(parseFlag(value), true, String(value));
  }
  for (const value of [false, undefined, null, 1, 0, '', '0', 'false', 'off', 'no', 'maybe', '2', 'enabled', 'yes please']) {
    assert.equal(parseFlag(value), false, String(value));
  }
});

test('resolveFlag lets a build-time env value override extra', () => {
  assert.equal(resolveFlag(undefined, true), true);
  assert.equal(resolveFlag(undefined, 'true'), true);
  assert.equal(resolveFlag(undefined, false), false);
  assert.equal(resolveFlag(undefined, 'maybe'), false);
  assert.equal(resolveFlag(undefined, undefined), false);
  assert.equal(resolveFlag('false', true), false);
  assert.equal(resolveFlag('0', true), false);
  assert.equal(resolveFlag('true', false), true);
  assert.equal(resolveFlag('maybe', true), false);
  assert.equal(resolveFlag('', true), false);
});
