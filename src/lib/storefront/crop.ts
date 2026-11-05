/**
 * Turns a feed objectPosition string into an expo-image contentPosition.
 * The app does not pick a crop per tile. A missing value uses the fallback
 * the caller passes, which is the previous behaviour for that surface.
 */

export type FeedImageFit = 'cover' | 'contain';

export type FeedContentPosition =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | { left: string; top: string };

const PERCENT = /^-?\d+(?:\.\d+)?%$/;
const HORIZONTAL = new Set(['left', 'right']);
const VERTICAL = new Set(['top', 'bottom']);

/** Home tiles and hub covers used this crop before objectPosition existed. */
export const HOME_CROP_WHEN_FEED_OMITS: FeedContentPosition = 'top';

/** Shop, type, and athlete tiles used the centred cover before objectPosition existed. */
export const TILE_CROP_WHEN_FEED_OMITS: FeedContentPosition = 'center';

/**
 * Product cards used contain in a padded well. The site crops listing photos,
 * so a feed that omits imageFit uses cover. Rollback keeps contain.
 */
export const CARD_FIT_WHEN_FEED_OMITS: FeedImageFit = 'cover';
export const CARD_FIT_ON_ROLLBACK: FeedImageFit = 'contain';

export function readImageFit(value: unknown): FeedImageFit | null {
  if (value == null) return null;
  if (value === 'cover' || value === 'contain') return value;
  return null;
}

function axis(token: string, which: 'x' | 'y'): string | null {
  if (token === 'center') return '50%';
  if (token === 'left' && which === 'x') return '0%';
  if (token === 'right' && which === 'x') return '100%';
  if (token === 'top' && which === 'y') return '0%';
  if (token === 'bottom' && which === 'y') return '100%';
  if (PERCENT.test(token)) return token;
  return null;
}

/** Null when the string is not a CSS object-position of one or two tokens. */
export function parseObjectPosition(value: string): FeedContentPosition | null {
  const parts = value.trim().split(/\s+/);
  if (parts.length < 1 || parts.length > 2) return null;
  if (parts.length === 1) {
    const [token] = parts;
    if (token === 'top' || token === 'bottom' || token === 'left' || token === 'right' || token === 'center') {
      return token;
    }
    if (PERCENT.test(token)) return { left: token, top: '50%' };
    return null;
  }
  let [x, y] = parts;
  const xIsVertical = VERTICAL.has(x);
  const yIsHorizontal = HORIZONTAL.has(y);
  if (xIsVertical && (yIsHorizontal || y === 'center' || PERCENT.test(y))) {
    [x, y] = [y, x];
  } else if (HORIZONTAL.has(y) && !HORIZONTAL.has(x)) {
    [x, y] = [y, x];
  }
  const left = axis(x, 'x');
  const top = axis(y, 'y');
  if (!left || !top) return null;
  return { left, top };
}

/** Keeps a usable objectPosition string, or null when the feed omits or breaks it. */
export function readObjectPosition(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed || trimmed.length > 40) return null;
  if (!parseObjectPosition(trimmed)) return null;
  return trimmed;
}

export function contentPositionFor(
  objectPosition: string | null | undefined,
  fallback: FeedContentPosition,
): FeedContentPosition {
  if (!objectPosition) return fallback;
  return parseObjectPosition(objectPosition) ?? fallback;
}

/** Same file, ignoring a cache-buster query, so a hub cover is not reused as an athlete tile. */
export function sameImageFile(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) return false;
  if (left === right) return true;
  try {
    const a = new URL(left);
    const b = new URL(right);
    return a.origin === b.origin && a.pathname === b.pathname;
  } catch {
    return false;
  }
}
