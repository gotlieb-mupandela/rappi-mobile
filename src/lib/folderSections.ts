type Section<T> = { key: string; title: string; products: T[] };

type LineSource = {
  line?: string;
  item?: string;
  subcategory?: string;
};

type SectionFacets =
  | {
      subs?: Array<{ slug: string; name: string }>;
    }
  | undefined;

function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Supplier line text such as "Aro reversible [7]" becomes "Aro Reversible". */
function fromItem(item: string | undefined): string {
  const name = (item ?? '').replace(/\s*\[\d+\]\s*$/, '').trim();
  return name ? titleCase(name) : 'More';
}

/**
 * Section label for one product when a folder groups by line.
 * A non-empty `line` is the website's clean label: trim it, and title-case it only when that leaves the text unchanged.
 * Otherwise fall back to supplier `item`, then "More".
 */
export function lineName(product: Pick<LineSource, 'line' | 'item'>): string {
  const line = typeof product.line === 'string' ? product.line.trim() : '';
  if (line) {
    const cased = titleCase(line);
    return cased === line ? cased : line;
  }
  return fromItem(typeof product.item === 'string' ? product.item : undefined);
}

/**
 * The website splits each page into sections: by product line when the folder is a single subcategory,
 * otherwise by subcategory in catalog order with "More" last.
 */
export function sectionProducts<T extends LineSource>(products: T[], facets: SectionFacets, byLine: boolean): Section<T>[] {
  const sections = new Map<string, Section<T>>();
  for (const product of products) {
    const key = byLine ? lineName(product) : product.subcategory || 'general';
    const title = byLine
      ? key
      : key === 'general'
        ? 'More'
        : (facets?.subs?.find((sub) => sub.slug === key)?.name ?? titleCase(key.replace(/-/g, ' ')));
    const section = sections.get(key) ?? { key, title, products: [] };
    section.products.push(product);
    sections.set(key, section);
  }
  const subOrder = (facets?.subs ?? []).map((sub) => sub.slug);
  const rank = (section: Section<T>) => {
    if (section.title === 'More') return Number.MAX_SAFE_INTEGER;
    if (byLine) return 0;
    const index = subOrder.indexOf(section.key);
    return index === -1 ? subOrder.length : index;
  };
  return [...sections.values()].sort((a, b) => rank(a) - rank(b) || (byLine ? a.title.localeCompare(b.title) : 0));
}
