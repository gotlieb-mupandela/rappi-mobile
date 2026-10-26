import { resolveTarget } from './contract.ts';
import type { MobileStorefront, StorefrontLanguage, StorefrontNode, StorefrontProduct } from './types.ts';

export function localized(copy: { en: string; fr: string }, language: StorefrontLanguage): string {
  if (language === 'fr' && copy.fr.trim()) return copy.fr;
  return copy.en;
}

export function visibleNodes(nodes: readonly StorefrontNode[], parent: string | null): StorefrontNode[] {
  return nodes
    .filter((node) => node.parent === parent && !node.hidden && resolveTarget(node.target) !== null)
    .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
}

export function hasVisibleChildren(nodes: readonly StorefrontNode[], key: string): boolean {
  return visibleNodes(nodes, key).length > 0;
}

export function menuLevel(
  feed: MobileStorefront,
  menuKey: string,
  path: readonly string[],
): { trail: StorefrontNode[]; nodes: StorefrontNode[] } | null {
  const root = feed.menus.find((node) => node.key === menuKey);
  if (!root || root.hidden || resolveTarget(root.target) === null) return null;
  const trail = [root];
  let parent = root.key;
  for (const key of path) {
    const next = visibleNodes(feed.menus, parent).find((node) => node.key === key);
    if (!next) return null;
    trail.push(next);
    parent = next.key;
  }
  return { trail, nodes: visibleNodes(feed.menus, parent) };
}

export function orderedCategories(feed: MobileStorefront): StorefrontNode[] {
  return visibleNodes(feed.categories, null);
}

/** Category children when the feed nests them. Otherwise menu folders whose target opens this category. */
export function foldersForCategory(feed: MobileStorefront, slug: string): StorefrontNode[] {
  const nested = visibleNodes(feed.categories, slug);
  if (nested.length > 0) return nested;
  return feed.menus
    .filter((node) => {
      if (node.hidden) return false;
      const route = resolveTarget(node.target);
      return route?.screen === 'group' && route.cat === slug;
    })
    .sort((a, b) => a.order - b.order || a.key.localeCompare(b.key));
}

export function categoryNode(feed: MobileStorefront, slug: string): StorefrontNode | undefined {
  return feed.categories.find((node) => node.key === slug);
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
