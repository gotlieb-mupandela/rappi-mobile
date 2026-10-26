import type { StorefrontRoute } from "./types.ts";
import { FEED_TARGETS } from "./feedTargets.generated.ts";

/**
 * Exact target paths from rappi-webapp feedTargetTable(), namespacedFeedTargets(), and the sub-link list.
 * Both shas are data/web-pin.json. scripts/gen-feed-targets.mjs writes the one map.
 * Lookup is Map.get on the exact href. Nothing in this module parses a query.
 * A path that is not in the map is unknown and opens nothing.
 */
export const HIDDEN_FEED_TARGETS: readonly string[] = [];

export function resolveTarget(key: string): StorefrontRoute | null {
  if (typeof key !== "string") return null;
  return FEED_TARGETS.get(key) ?? null;
}
