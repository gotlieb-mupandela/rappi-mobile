import assert from 'node:assert/strict';
import test from 'node:test';

import { parityFolderPatch, storefrontTileUrl, withStorefrontNode } from './storefront.ts';

const menus = {
  men: { tiles: { 'jp-916ee19d09': 'https://example.com/indoor.jpg', teamwear: 'https://example.com/team.jpg' } },
  women: { tiles: { 'w-cycling': 'https://example.com/cycling.jpg', cycling: 'https://example.com/direct.jpg' } },
  kits: { tiles: { 'jp-9ec1469982': 'https://example.com/replicas.jpg' } },
  outlet: { tiles: { 'jp-8dd93a2ea5': 'https://example.com/swim.jpg' } },
};

test('storefront pictures follow the website tile id when the app key differs', () => {
  assert.equal(storefrontTileUrl(menus, 'men', 'fitness-gym'), 'https://example.com/indoor.jpg');
  assert.equal(storefrontTileUrl(menus, 'women', 'cycling'), 'https://example.com/direct.jpg');
  assert.equal(storefrontTileUrl(menus, 'kits', 'kits-replicas'), 'https://example.com/replicas.jpg');
  assert.equal(storefrontTileUrl(menus, 'outlet', 'outlet-apparel-byear'), 'https://example.com/swim.jpg');
  assert.equal(storefrontTileUrl(menus, 'men', 'missing'), undefined);
});

test('only the empty men fitness folder is retargeted', () => {
  assert.deepEqual(parityFolderPatch('men', 'fitness-gym'), { folder: 'jp-916ee19d09', name: 'Indoor' });
  assert.equal(parityFolderPatch('women', 'cycling'), undefined);
  assert.equal(parityFolderPatch('men', 'teamwear'), undefined);
});

test('parity overlay leaves the shipped node alone until parity is on', () => {
  const node = { key: 'fitness-gym', name: 'Fitness / Gym', image: 'J:old.jpg', folder: 'fitness-gym' };
  assert.equal(withStorefrontNode('men', node, menus, false), node);
  assert.deepEqual(withStorefrontNode('men', node, menus, true), {
    key: 'fitness-gym',
    name: 'Indoor',
    image: 'https://example.com/indoor.jpg',
    folder: 'jp-916ee19d09',
  });
});
