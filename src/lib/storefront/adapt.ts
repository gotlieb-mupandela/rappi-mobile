import { resolveTarget } from './targets.ts';
import type { MobileStorefront, StorefrontLanguage, StorefrontNode, StorefrontProduct } from './types.ts';

export function localized(copy: { en: string; fr: string }, language: StorefrontLanguage): string {
  if (language === 'fr' && copy.fr.trim()) return copy.fr;
  return copy.en;
}

function byKey(feed: MobileStorefront): Map<string, StorefrontNode> {
  const map = new Map<string, StorefrontNode>();
  for (const node of feed.nodes) map.set(node.key, node);
  return map;
}

export function childNodes(feed: MobileStorefront, key: string): StorefrontNode[] {
  const nodes = byKey(feed);
  const parent = nodes.get(key);
  if (!parent) return [];
  const children: StorefrontNode[] = [];
  for (const childKey of parent.tiles) {
    const node = nodes.get(childKey);
    if (!node || node.hidden || resolveTarget(node.target) === null) continue;
    children.push(node);
  }
  return children;
}

export function hasVisibleChildren(feed: MobileStorefront, key: string): boolean {
  return childNodes(feed, key).length > 0;
}

export function homeTiles(feed: MobileStorefront): StorefrontNode[] {
  return childNodes(feed, 'home');
}

export function headerMenus(feed: MobileStorefront): StorefrontNode[] {
  const nodes = byKey(feed);
  const menus: StorefrontNode[] = [];
  for (const key of feed.menus) {
    const node = nodes.get(key);
    if (!node || node.hidden || resolveTarget(node.target) === null) continue;
    menus.push(node);
  }
  return menus;
}

export function menuLevel(
  feed: MobileStorefront,
  menuKey: string,
  path: readonly string[],
): { trail: StorefrontNode[]; nodes: StorefrontNode[] } | null {
  const nodes = byKey(feed);
  const root = nodes.get(menuKey);
  if (!root || root.hidden || resolveTarget(root.target) === null) return null;
  const trail = [root];
  let parent = root.key;
  for (const key of path) {
    const next = childNodes(feed, parent).find((node) => node.key === key);
    if (!next) return null;
    trail.push(next);
    parent = next.key;
  }
  return { trail, nodes: childNodes(feed, parent) };
}

export function orderedCategories(feed: MobileStorefront): StorefrontNode[] {
  const nodes = byKey(feed);
  const categories: StorefrontNode[] = [];
  for (const key of feed.categoryOrder) {
    const node = nodes.get(key);
    if (!node || node.hidden || resolveTarget(node.target) === null) continue;
    categories.push(node);
  }
  return categories;
}

/** Shop-by-type tiles listed on a category node. */
export function foldersForCategory(feed: MobileStorefront, slug: string): StorefrontNode[] {
  return childNodes(feed, slug);
}

export function categoryNode(feed: MobileStorefront, slug: string): StorefrontNode | undefined {
  return feed.nodes.find((node) => node.key === slug);
}

export function indexProducts(feed: MobileStorefront | null): Map<string, StorefrontProduct> {
  const map = new Map<string, StorefrontProduct>();
  if (!feed) return map;
  for (const product of feed.products) map.set(product.code, product);
  return map;
}

export function lineByCode(feed: MobileStorefront | null): Map<string, string> | null {
  if (!feed) return null;
  const map = new Map<string, string>();
  for (const product of feed.products) {
    if (product.line && product.line.trim()) map.set(product.code, product.line);
  }
  return map;
}
