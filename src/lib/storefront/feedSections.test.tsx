import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
import { Image, Pressable, Text } from 'react-native';

import { audienceNodes, categoryHubImage, foldersForCategory, headerMenus, homeTiles, localized, shopTileDestination } from './adapt.ts';
import { validateMobileStorefront } from './contract.ts';
import { AthleteCards, HomeFeed, HubCover, HubTypeGrid, MenuUnavailable, ShopFeed, type FeedTileModel } from './feedSections.tsx';
import type { MobileStorefront, StorefrontNode } from './types.ts';

function baseFeed(): MobileStorefront {
  const parsed = validateMobileStorefront(JSON.parse(readFileSync(new URL('./fixture.json', import.meta.url), 'utf8')));
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.value;
}

function node(partial: Pick<StorefrontNode, 'key' | 'kind' | 'target' | 'image' | 'title'> & Partial<StorefrontNode>): StorefrontNode {
  return {
    parent: null,
    order: 0,
    description: partial.title,
    hidden: false,
    count: 1,
    group: null,
    tiles: [],
    span: null,
    tone: null,
    slug: null,
    audiences: [],
    ...partial,
  };
}

function sample(): MobileStorefront {
  const feed = structuredClone(baseFeed());
  const home = feed.nodes.find((item) => item.key === 'home');
  assert.ok(home);
  home.tiles = [...home.tiles, 'secret-link'];
  const kids = feed.nodes.find((item) => item.key === 'children');
  assert.ok(kids);
  kids.image = null;
  feed.nodes.push(
    node({
      key: 'secret-link',
      kind: 'tile',
      parent: 'home',
      target: '/shop/shoes?group=not-a-feed-folder',
      image: 'https://www.rappisportshub.com/brand/secret.png',
      title: { en: 'Secret link', fr: 'Lien secret' },
    }),
    node({
      key: 'audience-men',
      kind: 'audience',
      order: 0,
      target: '/shop/men',
      image: 'https://www.rappisportshub.com/brand/audience-men.png',
      title: { en: 'Men', fr: 'Homme' },
    }),
    node({
      key: 'audience-women',
      kind: 'audience',
      order: 1,
      target: '/shop/women',
      image: null,
      title: { en: 'Women', fr: 'Femme' },
    }),
    node({
      key: 'audience-hidden',
      kind: 'audience',
      order: 2,
      target: '/not-a-real-path',
      image: 'https://www.rappisportshub.com/brand/audience-women.png',
      title: { en: 'Hidden audience', fr: 'Public cache' },
    }),
  );
  return feed;
}

function textsOf(tree: ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).flatMap((item) => {
    const children = item.props.children;
    if (typeof children === 'string') return [children];
    if (Array.isArray(children)) return children.filter((child): child is string => typeof child === 'string');
    return [];
  });
}

function tilesOf(feed: MobileStorefront, keys: StorefrontNode[]): FeedTileModel[] {
  return keys.map((item) => ({
    key: item.key,
    label: localized(item.title, 'en'),
    image: item.image,
    span: item.span,
    tone: item.tone,
  }));
}

test('feed home tiles, shop menus, hub types, audiences and athletes render from the feed', () => {
  const feed = sample();
  const home = homeTiles(feed);
  assert.equal(home.some((item) => item.key === 'secret-link'), false);
  assert.deepEqual(headerMenus(feed).map((item) => item.key), ['man', 'woman', 'children', 'teams']);
  assert.deepEqual(foldersForCategory(feed, 'sportswear').map((item) => item.key), [
    'beachwear',
    'fitness-gym-woman',
    'sportswear--shirts',
  ]);
  assert.equal(categoryHubImage(feed, 'sportswear'), 'https://www.rappisportshub.com/brand/hub-sportswear.png');
  assert.deepEqual(audienceNodes(feed).map((item) => item.key), ['audience-men', 'audience-women']);

  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<HomeFeed status="ready" tiles={tilesOf(feed, home)} onRetry={() => undefined} onOpen={() => undefined} />);
  });
  const labels = textsOf(tree);
  assert.equal(labels.includes('Kids'), true);
  assert.equal(labels.includes('Teams'), true);
  assert.equal(labels.includes('Sportswear'), true);
  assert.equal(labels.includes('Secret link'), false);
  const kids = tree.root.findAllByType(Pressable).find((item) => item.props.accessibilityLabel === 'Kids');
  assert.ok(kids);
  assert.equal(kids.findAllByType(Image).length, 0);
  const teams = tree.root.findAllByType(Pressable).find((item) => item.props.accessibilityLabel === 'Teams');
  assert.ok(teams);
  const teamsStyle = typeof teams.props.style === 'function' ? teams.props.style({ pressed: false }) : teams.props.style;
  const tileStyle = Object.assign({}, ...(Array.isArray(teamsStyle) ? teamsStyle.filter(Boolean) : [teamsStyle]));
  assert.equal(tileStyle.height, 210);
  assert.equal(tileStyle.width, '100%');
  const teamsImage = teams.findAllByType(Image)[0];
  assert.ok(teamsImage);
  assert.equal(teamsImage.props.contentFit, 'cover');
  assert.equal(teamsImage.props.style.height, '100%');
  assert.equal(teamsImage.props.style.width, '100%');

  act(() => {
    tree = create(<ShopFeed status="ready" menus={tilesOf(feed, headerMenus(feed))} onRetry={() => undefined} onOpen={() => undefined} />);
  });
  assert.deepEqual(textsOf(tree), ['Man', 'Woman', 'Kids', 'Teams']);

  act(() => {
    tree = create(
      <>
        <HubCover image={categoryHubImage(feed, 'sportswear')} />
        <HubTypeGrid tiles={tilesOf(feed, foldersForCategory(feed, 'sportswear'))} onOpen={() => undefined} />
        <AthleteCards tiles={tilesOf(feed, audienceNodes(feed))} onOpen={() => undefined} />
      </>,
    );
  });
  assert.equal(tree.root.findByProps({ testID: 'hub-cover' }).props.source.uri, 'https://www.rappisportshub.com/brand/hub-sportswear.png');
  assert.equal(textsOf(tree).includes('Beachwear'), true);
  assert.equal(textsOf(tree).includes('Men'), true);
  assert.equal(textsOf(tree).includes('Women'), true);
  assert.equal(textsOf(tree).includes('Hidden audience'), false);
  assert.ok(tree.root.findByProps({ testID: 'athlete-image-audience-men' }));
  assert.ok(tree.root.findByProps({ testID: 'athlete-no-image-audience-women' }));
});

test('a null hub cover shows no image and a missing feed shows retry', () => {
  let retried = 0;
  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(
      <>
        <HubCover image={null} />
        <HomeFeed status="unavailable" tiles={[]} onRetry={() => { retried += 1; }} onOpen={() => undefined} />
        <ShopFeed status="loading" menus={[]} onRetry={() => undefined} onOpen={() => undefined} />
      </>,
    );
  });
  assert.ok(tree.root.findByProps({ testID: 'hub-cover-empty' }));
  assert.equal(tree.root.findAllByType(Image).length, 0);
  const texts = textsOf(tree);
  assert.equal(texts.includes("Can't load the shop"), true);
  assert.equal(texts.includes('Try again'), true);
  assert.equal(texts.includes('Loading the shop'), true);
  assert.equal(texts.includes('Teamwear'), false);
  const retry = tree.root.findAllByType(Pressable).find((item) => item.props.accessibilityLabel === 'Try again');
  assert.ok(retry);
  retry.props.onPress();
  assert.equal(retried, 1);
});

test('a shop tile with children opens the menu level and one without opens its target', () => {
  const feed = sample();
  const withChildren = shopTileDestination(feed, 'man');
  assert.deepEqual(withChildren, { kind: 'menu', menu: 'man' });
  const leaf = shopTileDestination(feed, 'teams');
  assert.equal(leaf?.kind, 'target');
  if (leaf?.kind !== 'target') return;
  assert.equal(leaf.route.screen, 'menu');
  assert.equal(shopTileDestination(feed, 'not-a-menu'), null);

  let tree!: ReactTestRenderer;
  act(() => {
    tree = create(<MenuUnavailable />);
  });
  assert.ok(tree.root.findByProps({ testID: 'menu-unavailable' }));
  assert.equal(textsOf(tree).includes("This page isn't available."), true);
});
