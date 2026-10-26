import type { StorefrontRoute } from "./types.ts";
import { FEED_TARGETS } from "./feedTargets.generated.ts";
import { SUB_LINK_TARGETS } from "./subLinkTargets.generated.ts";

/**
 * Exact target paths from rappi-webapp feedTargetTable() and namespacedFeedTargets().
 * The sha is data/web-pin.json. scripts/gen-feed-targets.mjs writes that map.
 * Shop sub-link hrefs are a Map of exact href strings, copied into the same lookup.
 * Lookup is Map.get on the exact href. Nothing in this module parses a query.
 * A path that is not in the map is unknown and opens nothing.
 */
export const HIDDEN_FEED_TARGETS: readonly string[] = [];

const TARGETS = new Map<string, StorefrontRoute>(FEED_TARGETS);
for (const [key, route] of SUB_LINK_TARGETS) {
  if (TARGETS.has(key)) {
    throw new Error(`sub-link target duplicates a fixed alias: ${key}`);
  }
  TARGETS.set(key, route);
}

export function resolveTarget(key: string): StorefrontRoute | null {
  if (typeof key !== "string") return null;
  return TARGETS.get(key) ?? null;
}
