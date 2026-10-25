import assert from 'node:assert/strict';
import test from 'node:test';

import { lineName, sectionProducts } from './folderSections.ts';

test('uses line as the section title when only line is present', () => {
  assert.equal(lineName({ line: 'Aro Reversible' }), 'Aro Reversible');
  assert.equal(lineName({ line: '  Court Line  ' }), 'Court Line');
  assert.equal(lineName({ line: 'T-Shirt' }), 'T-Shirt');

  const sections = sectionProducts(
    [
      { code: 'a', line: 'Court Line' },
      { code: 'b', line: '  Court Line  ' },
      { code: 'c', line: 'T-Shirt' },
    ],
    undefined,
    true,
  );

  assert.deepEqual(
    sections.map((section) => ({ title: section.title, codes: section.products.map((product) => product.code) })),
    [
      { title: 'Court Line', codes: ['a', 'b'] },
      { title: 'T-Shirt', codes: ['c'] },
    ],
  );
});

test('uses item when line is absent', () => {
  assert.equal(lineName({ item: 'Aro reversible' }), 'Aro Reversible');

  const sections = sectionProducts([{ code: 'a', item: 'Aro reversible' }], undefined, true);
  assert.deepEqual(sections.map((section) => section.title), ['Aro Reversible']);
});

test('line wins when both line and item are present', () => {
  assert.equal(lineName({ line: 'Court Line', item: 'Aro reversible [7]' }), 'Court Line');
  assert.equal(lineName({ line: 'Aro Reversible [7]', item: 'Other item [2]' }), 'Aro Reversible [7]');

  const sections = sectionProducts([{ code: 'a', line: 'Court Line', item: 'Aro reversible [7]' }], undefined, true);
  assert.deepEqual(sections.map((section) => section.title), ['Court Line']);
});

test('uses More when line and item are missing', () => {
  assert.equal(lineName({}), 'More');

  const sections = sectionProducts([{ code: 'a' }, { code: 'b', item: '' }], undefined, true);
  assert.equal(sections.length, 1);
  assert.equal(sections[0]?.title, 'More');
  assert.deepEqual(
    sections[0]?.products.map((product) => product.code),
    ['a', 'b'],
  );
});

test('empty line falls back to item', () => {
  assert.equal(lineName({ line: '', item: 'Aro reversible [7]' }), 'Aro Reversible');
  assert.equal(lineName({ line: '   ', item: 'middle run' }), 'Middle Run');

  const sections = sectionProducts([{ code: 'a', line: ' ', item: 'Aro reversible [7]' }], undefined, true);
  assert.deepEqual(sections.map((section) => section.title), ['Aro Reversible']);
});

test('strips a trailing [7] suffix from item', () => {
  assert.equal(lineName({ item: 'Aro reversible [7]' }), 'Aro Reversible');
  assert.equal(lineName({ item: 'zeta pro [12]' }), 'Zeta Pro');
  assert.equal(lineName({ item: 'plain [3]  ' }), 'Plain');
});

test('sorts More last', () => {
  const sections = sectionProducts(
    [
      { code: 'z', line: 'Zebra' },
      { code: 'm' },
      { code: 'a', item: 'Aro reversible [7]' },
    ],
    undefined,
    true,
  );

  assert.deepEqual(sections.map((section) => section.title), ['Aro Reversible', 'Zebra', 'More']);
});

test('keeps section order unchanged', () => {
  const byItem = sectionProducts(
    [
      { code: 'z', item: 'zeta pro [1]' },
      { code: 'a1', item: 'Aro reversible [7]' },
      { code: 'a2', item: 'aro reversible [3]' },
      { code: 'blank', item: '   ' },
      { code: 'mid', item: 'middle run' },
    ],
    undefined,
    true,
  );

  assert.deepEqual(
    byItem.map((section) => ({ title: section.title, codes: section.products.map((product) => product.code) })),
    [
      { title: 'Aro Reversible', codes: ['a1', 'a2'] },
      { title: 'Middle Run', codes: ['mid'] },
      { title: 'Zeta Pro', codes: ['z'] },
      { title: 'More', codes: ['blank'] },
    ],
  );

  const facets = {
    subs: [
      { slug: 'hoodies', name: 'Hoodies' },
      { slug: 'jackets', name: 'Jackets' },
    ],
  };
  const bySubcategory = sectionProducts(
    [
      { code: 'j', subcategory: 'jackets', line: 'Should Not Win', item: 'Ignored [1]' },
      { code: 'h', subcategory: 'hoodies', line: 'Also Ignored' },
      { code: 'g', subcategory: '' },
      { code: 'u', subcategory: 'unknown-group' },
    ],
    facets,
    false,
  );

  assert.deepEqual(
    bySubcategory.map((section) => ({
      key: section.key,
      title: section.title,
      codes: section.products.map((product) => product.code),
    })),
    [
      { key: 'hoodies', title: 'Hoodies', codes: ['h'] },
      { key: 'jackets', title: 'Jackets', codes: ['j'] },
      { key: 'unknown-group', title: 'Unknown Group', codes: ['u'] },
      { key: 'general', title: 'More', codes: ['g'] },
    ],
  );
});
