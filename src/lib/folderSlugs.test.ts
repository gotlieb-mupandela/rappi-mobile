import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  FOLDER_SLUG_ALIASES,
  FLOW_FOLDER_LABEL,
  canonicalFolderKey,
  canonicalFolderSlug,
  fallbackFolderName,
  flowFolderLabel,
  folderQueryFields,
  slugHeading,
} from './folderSlugs.ts';

test('maps old folder slugs and leaves every other slug unchanged', () => {
  assert.deepEqual(Object.keys(FOLDER_SLUG_ALIASES), ['joma-flow', 'joma-kids']);
  assert.equal(FOLDER_SLUG_ALIASES['joma-flow'], 'flow');
  assert.equal(FOLDER_SLUG_ALIASES['joma-kids'], 'kids');

  assert.equal(canonicalFolderSlug('joma-flow'), 'flow');
  assert.equal(canonicalFolderSlug('joma-kids'), 'kids');
  assert.equal(canonicalFolderSlug('flow'), 'flow');
  assert.equal(canonicalFolderSlug('kids'), 'kids');
  assert.equal(canonicalFolderSlug('football'), 'football');
  assert.equal(canonicalFolderSlug('joma-flow-extra'), 'joma-flow-extra');
  assert.equal(canonicalFolderSlug('Joma-flow'), 'Joma-flow');
  assert.equal(canonicalFolderSlug('toString'), 'toString');
});

test('rewrites folder keys and query fields only through the alias table', () => {
  assert.equal(canonicalFolderKey('joma-flow'), 'flow');
  assert.equal(canonicalFolderKey('sub:joma-flow'), 'sub:flow');
  assert.equal(canonicalFolderKey('sub:joma-kids@jackets'), 'sub:kids@jackets');
  assert.equal(canonicalFolderKey('sub:futsal'), 'sub:futsal');
  assert.equal(canonicalFolderKey('teamwear'), 'teamwear');
  assert.equal(canonicalFolderKey('q:joma-flow'), 'q:joma-flow');

  assert.deepEqual(folderQueryFields('sub:joma-flow'), { sub: 'flow' });
  assert.deepEqual(folderQueryFields('sub:flow'), { sub: 'flow' });
  assert.deepEqual(folderQueryFields('joma-kids'), { group: 'kids' });
  assert.deepEqual(folderQueryFields('sub:futsal'), { sub: 'futsal' });
  assert.deepEqual(folderQueryFields('teamwear'), { group: 'teamwear' });
  assert.deepEqual(folderQueryFields('q:joma-flow'), { q: 'joma-flow' });
});

test('flow label comes from the feed and never falls back to joma', () => {
  assert.equal(/joma/i.test(FLOW_FOLDER_LABEL), false);
  assert.equal(flowFolderLabel(undefined, undefined), 'Flow');
  assert.equal(/joma/i.test(flowFolderLabel(undefined, undefined)), false);
  assert.equal(flowFolderLabel([{ key: 'flow', name: 'Flow Run' }], undefined), 'Flow Run');
  assert.equal(flowFolderLabel([{ key: 'joma-flow', name: 'Flow Run' }], undefined), 'Flow Run');
  assert.equal(
    flowFolderLabel(
      [
        { key: 'joma-flow', name: 'Old' },
        { key: 'flow', name: 'New' },
      ],
      undefined,
    ),
    'New',
  );
  assert.equal(flowFolderLabel(undefined, [{ slug: 'flow', name: 'Flow Pro' }]), 'Flow Pro');
  assert.equal(flowFolderLabel(undefined, [{ slug: 'joma-flow', name: 'Flow Pro' }]), 'Flow Pro');
  assert.equal(
    flowFolderLabel([{ key: 'flow', name: 'From Folders' }], [{ slug: 'flow', name: 'From Subs' }]),
    'From Folders',
  );
  assert.equal(
    flowFolderLabel([{ key: 'football', name: 'Football' }], [{ slug: 'running-shoes', name: 'Running' }]),
    'Flow',
  );

  assert.equal(slugHeading('joma-flow'), 'Flow');
  assert.equal(slugHeading('joma-kids'), 'Kids');
  assert.equal(slugHeading('running-shoes'), 'Running Shoes');
  assert.equal(/joma/i.test(slugHeading('joma-flow')), false);
  assert.equal(/joma/i.test(slugHeading('joma-kids')), false);
  assert.equal(fallbackFolderName('joma-flow'), 'Flow');
  assert.equal(fallbackFolderName('sub:joma-kids'), 'Kids');
  assert.equal(fallbackFolderName('running-trail'), 'running trail');
  assert.equal(/joma/i.test(fallbackFolderName('sub:joma-flow')), false);
});

test('the footwear flow tile does not hardcode a joma label', () => {
  const source = readFileSync(new URL('./menus.ts', import.meta.url), 'utf8');
  assert.equal(source.includes('Joma flow'), false);
  assert.equal(source.includes('FLOW_FOLDER_LABEL'), true);
  assert.equal(source.includes("sub('flow')"), true);
});
