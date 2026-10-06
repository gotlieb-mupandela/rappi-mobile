export type BagLine = {
  code: string;
  size: string;
  qty: number;
  name: string;
  imageUrl: string;
  price: number;
  /** Database product id; `cart_items.product_id` references this, not the code. */
  id?: string;
};

/** A line whose local quantity (or removal) has not reached the account yet. */
export type PendingLine = { code: string; size: string; id?: string };

export type BagState = {
  /** Account the bag belongs to, or null for a guest bag kept only on this phone. */
  owner: string | null;
  lines: BagLine[];
  pending: PendingLine[];
  /** A guest bag handed to the account but not yet combined with what the account already holds. */
  adopting: boolean;
};

export type RemoteBagRow = Required<BagLine>;

/** What one push sent: the quantity uploaded, or null for a delete. */
export type SentLine = { code: string; size: string; qty: number | null };

export const EMPTY_BAG: BagState = { owner: null, lines: [], pending: [], adopting: false };

export function clampQty(qty: number): number {
  return Math.min(99, Math.max(1, Math.round(qty)));
}

export function lineKey(line: { code: string; size: string }): string {
  return `${line.code}|${line.size}`;
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && !!value.trim();
}

function parseLine(line: unknown): BagLine | null {
  if (!line || typeof line !== 'object') return null;
  const value = line as Record<string, unknown>;
  if (
    !isText(value.code) ||
    typeof value.size !== 'string' ||
    typeof value.qty !== 'number' ||
    !Number.isFinite(value.qty) ||
    value.qty <= 0 ||
    typeof value.price !== 'number' ||
    !Number.isFinite(value.price) ||
    value.price < 0
  ) {
    return null;
  }
  return {
    code: value.code,
    size: value.size,
    qty: clampQty(value.qty),
    // Products without a name or photo are still sold; dropping the line here would also delete it from the account bag.
    name: isText(value.name) ? value.name : value.code,
    imageUrl: typeof value.imageUrl === 'string' ? value.imageUrl : '',
    price: value.price,
    id: isText(value.id) ? value.id : undefined,
  };
}

function uniqueByKey<T extends { code: string; size: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = lineKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseStoredBag(raw: unknown): BagState {
  if (Array.isArray(raw)) {
    // Version 1 stored a bare array of lines for a guest bag.
    return { ...EMPTY_BAG, lines: uniqueByKey(raw.map(parseLine).filter((line): line is BagLine => !!line)) };
  }
  if (!raw || typeof raw !== 'object') return EMPTY_BAG;
  const value = raw as Record<string, unknown>;
  const lines = (Array.isArray(value.lines) ? value.lines : []).map(parseLine).filter((line): line is BagLine => !!line);
  const pending = (Array.isArray(value.pending) ? value.pending : [])
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && typeof item.code === 'string' && typeof item.size === 'string')
    .map((item) => ({ code: item.code as string, size: item.size as string, id: isText(item.id) ? item.id : undefined }));
  const owner = isText(value.owner) ? value.owner : null;
  return {
    owner,
    lines: uniqueByKey(lines),
    pending: owner ? uniqueByKey(pending) : [],
    adopting: !!owner && value.adopting === true,
  };
}

function addPending(pending: PendingLine[], items: PendingLine[]): PendingLine[] {
  const byKey = new Map(pending.map((item) => [lineKey(item), item]));
  for (const item of items) {
    const known = byKey.get(lineKey(item));
    byKey.set(lineKey(item), { ...item, id: item.id ?? known?.id });
  }
  return [...byKey.values()];
}

/** Replaces the lines, queueing every added, changed or removed line for upload when signed in. */
export function withLines(state: BagState, next: BagLine[]): BagState {
  if (next === state.lines) return state;
  if (!state.owner) return { ...state, lines: next };
  const before = new Map(state.lines.map((line) => [lineKey(line), line]));
  const after = new Map(next.map((line) => [lineKey(line), line]));
  const changed: PendingLine[] = [];
  for (const [key, line] of after) {
    const old = before.get(key);
    if (!old || old.qty !== line.qty) changed.push({ code: line.code, size: line.size, id: line.id ?? old?.id });
  }
  for (const [key, old] of before) {
    if (!after.has(key)) changed.push({ code: old.code, size: old.size, id: old.id });
  }
  return { ...state, lines: next, pending: addPending(state.pending, changed) };
}

/** Hands a guest bag to the account that just signed in; it is combined with the account's bag on the next pull. */
export function adoptGuestBag(state: BagState, owner: string): BagState {
  return { owner, lines: state.lines, pending: [], adopting: state.lines.length > 0 };
}

/** Attaches database ids to lines added before ids were known. */
export function attachBagIds(state: BagState, idsByCode: Record<string, string>): BagState {
  let changed = false;
  const lines = state.lines.map((line) => {
    const id = idsByCode[line.code];
    if (line.id || !id) return line;
    changed = true;
    return { ...line, id };
  });
  const pending = state.pending.map((item) => {
    const id = idsByCode[item.code];
    if (item.id || !id) return item;
    changed = true;
    return { ...item, id };
  });
  return changed ? { ...state, lines, pending } : state;
}

/**
 * The account is the source of truth, adjusted by local changes that have not reached it yet.
 * A freshly adopted guest bag is added on top of the account's bag instead of replacing it.
 */
export function mergeRemoteBag(state: BagState, remote: RemoteBagRow[]): BagState {
  const local = new Map(state.lines.map((line) => [lineKey(line), line]));
  const merged = new Map<string, BagLine>();

  if (state.adopting) {
    for (const row of remote) {
      const guest = local.get(lineKey(row));
      merged.set(lineKey(row), guest ? { ...guest, id: row.id, qty: clampQty(guest.qty + row.qty) } : row);
    }
    for (const line of state.lines) if (!merged.has(lineKey(line))) merged.set(lineKey(line), line);
    const guestPending = state.lines.map((line) => ({ code: line.code, size: line.size, id: merged.get(lineKey(line))?.id }));
    return { ...state, lines: ordered(state.lines, remote, merged), pending: addPending(state.pending, guestPending), adopting: false };
  }

  const pendingKeys = new Set(state.pending.map(lineKey));
  for (const row of remote) {
    if (pendingKeys.has(lineKey(row))) continue;
    const known = local.get(lineKey(row));
    merged.set(lineKey(row), known ? { ...known, id: row.id, qty: row.qty } : row);
  }
  for (const line of state.lines) if (pendingKeys.has(lineKey(line))) merged.set(lineKey(line), line);
  return { ...state, lines: ordered(state.lines, remote, merged) };
}

/** Keeps lines already on this phone where they were, with lines new from the account after them. */
function ordered(local: BagLine[], remote: RemoteBagRow[], merged: Map<string, BagLine>): BagLine[] {
  const result: BagLine[] = [];
  for (const item of [...local, ...remote]) {
    const line = merged.get(lineKey(item));
    if (!line) continue;
    result.push(line);
    merged.delete(lineKey(item));
  }
  return result;
}

/** Clears pending lines that still match what was sent; lines changed again meanwhile stay queued. */
export function settleBag(state: BagState, sent: SentLine[]): BagState {
  if (!sent.length) return state;
  const current = new Map(state.lines.map((line) => [lineKey(line), line.qty]));
  const settled = new Set(sent.filter((item) => (current.get(lineKey(item)) ?? null) === item.qty).map(lineKey));
  return { ...state, pending: state.pending.filter((item) => !settled.has(lineKey(item))) };
}
