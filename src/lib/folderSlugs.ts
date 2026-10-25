/**
 * Old website folder slugs that now live under a new slug.
 * Match these keys exactly. Do not prefix-match or rewrite any other value.
 */
export const FOLDER_SLUG_ALIASES = {
  'joma-flow': 'flow',
  'joma-kids': 'kids',
} as const;

const SUB_PREFIX = 'sub:';
const SEARCH_PREFIX = 'q:';

/** Shown until the catalog feed has a name for the flow folder. */
export const FLOW_FOLDER_LABEL = 'Flow';

export function canonicalFolderSlug(slug: string): string {
  if (Object.hasOwn(FOLDER_SLUG_ALIASES, slug)) {
    return FOLDER_SLUG_ALIASES[slug as keyof typeof FOLDER_SLUG_ALIASES];
  }
  return slug;
}

/** Folder route key. Search text is left unchanged. Unknown keys stay as they are. */
export function canonicalFolderKey(key: string): string {
  if (key.startsWith(SEARCH_PREFIX)) return key;
  if (key.startsWith(SUB_PREFIX)) {
    const [sub, group] = key.slice(SUB_PREFIX.length).split('@');
    const slug = canonicalFolderSlug(sub ?? '');
    const folder = group ? canonicalFolderSlug(group) : undefined;
    return folder ? `${SUB_PREFIX}${slug}@${folder}` : `${SUB_PREFIX}${slug}`;
  }
  return canonicalFolderSlug(key);
}

export function isFlowFolderKey(key: string | undefined): boolean {
  if (!key || key.startsWith(SEARCH_PREFIX)) return false;
  const slug = key.startsWith(SUB_PREFIX) ? key.slice(SUB_PREFIX.length).split('@')[0] : key;
  return canonicalFolderSlug(slug ?? '') === 'flow';
}

/**
 * `sub` and `group` values for a folder key.
 * Aliases are rewritten. Every other value is returned unchanged.
 */
export function folderQueryFields(key: string): { sub?: string; group?: string; q?: string } {
  if (key.startsWith(SEARCH_PREFIX)) return { q: key.slice(SEARCH_PREFIX.length) };
  if (key.startsWith(SUB_PREFIX)) {
    const [sub, group] = key.slice(SUB_PREFIX.length).split('@');
    const slug = canonicalFolderSlug(sub ?? '');
    const folder = group ? canonicalFolderSlug(group) : undefined;
    return folder ? { sub: slug, group: folder } : { sub: slug };
  }
  return { group: canonicalFolderSlug(key) };
}

/** Title-case fallback for a subcategory slug, after alias lookup. */
export function slugHeading(slug: string): string {
  const key = canonicalFolderSlug(slug).replace(/-/g, ' ');
  return key
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Name for a folder opened from a link when the route has no stored label. */
export function fallbackFolderName(key: string): string {
  const canonical = canonicalFolderKey(key);
  if (isFlowFolderKey(key) || isFlowFolderKey(canonical)) return FLOW_FOLDER_LABEL;
  if (canonical !== key) {
    const slug = canonical.startsWith(SUB_PREFIX) ? canonical.slice(SUB_PREFIX.length).split('@')[0] : canonical;
    return slugHeading(slug ?? '');
  }
  return key.replace(/[-_]+/g, ' ');
}

/**
 * Feed name for the flow folder: a folders entry, then a subs facet, looked up by
 * the new key and the old key. Falls back to Flow.
 */
export function flowFolderLabel(
  folders: readonly { key: string; name: string }[] | undefined,
  subs: readonly { slug: string; name: string }[] | undefined,
): string {
  const folderKeys = ['flow', `${SUB_PREFIX}flow`];
  const subSlugs = ['flow'];
  for (const [from, to] of Object.entries(FOLDER_SLUG_ALIASES)) {
    if (to !== 'flow') continue;
    folderKeys.push(from, `${SUB_PREFIX}${from}`);
    subSlugs.push(from);
  }
  for (const key of folderKeys) {
    const folder = folders?.find((item) => item.key === key && item.name);
    if (folder) return folder.name;
  }
  const nested = folders?.find((item) => isFlowFolderKey(item.key) && item.name);
  if (nested) return nested.name;
  for (const slug of subSlugs) {
    const sub = subs?.find((item) => item.slug === slug && item.name);
    if (sub) return sub.name;
  }
  return FLOW_FOLDER_LABEL;
}
