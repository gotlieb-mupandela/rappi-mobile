export type WishlistEntry = {
  code: string;
  /** Database product id; `wishlist_items.product_id` references this, not the code. */
  id?: string;
  size?: string;
  addedAt: number;
};

export type WishlistState = {
  /** Account the list belongs to, or null for a guest list kept only on this phone. */
  owner: string | null;
  entries: WishlistEntry[];
  pendingAdd: string[];
  pendingRemove: string[];
};

export type RemoteWishlistRow = { id: string; code: string; addedAt: number };

export const WISHLIST_LIMIT = 100;

export const EMPTY_WISHLIST: WishlistState = { owner: null, entries: [], pendingAdd: [], pendingRemove: [] };

function isText(value: unknown): value is string {
  return typeof value === 'string' && !!value.trim();
}

function uniqueText(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter(isText))] : [];
}

function uniqueByCode(entries: WishlistEntry[]): WishlistEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.code)) return false;
    seen.add(entry.code);
    return true;
  });
}

export function parseStoredWishlist(raw: unknown): WishlistState {
  if (Array.isArray(raw)) {
    // Version 1 stored a bare array of product codes, oldest first.
    const entries = uniqueText(raw).map((code, index) => ({ code, addedAt: index }));
    return { ...EMPTY_WISHLIST, entries };
  }
  if (!raw || typeof raw !== 'object') return EMPTY_WISHLIST;
  const value = raw as Record<string, unknown>;
  const entries = (Array.isArray(value.entries) ? value.entries : [])
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === 'object' && isText(entry.code))
    .map((entry) => ({
      code: entry.code as string,
      id: isText(entry.id) ? entry.id : undefined,
      size: isText(entry.size) ? entry.size : undefined,
      addedAt: typeof entry.addedAt === 'number' && Number.isFinite(entry.addedAt) ? entry.addedAt : 0,
    }));
  return {
    owner: isText(value.owner) ? value.owner : null,
    entries: uniqueByCode(entries),
    pendingAdd: uniqueText(value.pendingAdd),
    pendingRemove: uniqueText(value.pendingRemove),
  };
}

export function newestFirst(entries: WishlistEntry[]): WishlistEntry[] {
  return [...entries].sort((a, b) => b.addedAt - a.addedAt);
}

export function addEntry(state: WishlistState, entry: WishlistEntry): WishlistState {
  if (state.entries.some((item) => item.code === entry.code)) return state;
  if (state.entries.length >= WISHLIST_LIMIT) return state;
  const tracked = state.owner && entry.id;
  return {
    ...state,
    entries: [...state.entries, entry],
    pendingAdd: tracked && !state.pendingAdd.includes(entry.id!) ? [...state.pendingAdd, entry.id!] : state.pendingAdd,
    pendingRemove: tracked ? state.pendingRemove.filter((id) => id !== entry.id) : state.pendingRemove,
  };
}

export function removeEntry(state: WishlistState, code: string): WishlistState {
  const entry = state.entries.find((item) => item.code === code);
  if (!entry) return state;
  const tracked = state.owner && entry.id;
  return {
    ...state,
    entries: state.entries.filter((item) => item.code !== code),
    pendingAdd: tracked ? state.pendingAdd.filter((id) => id !== entry.id) : state.pendingAdd,
    pendingRemove: tracked && !state.pendingRemove.includes(entry.id!) ? [...state.pendingRemove, entry.id!] : state.pendingRemove,
  };
}

/** Attaches database ids to entries saved before ids were known; signed-in lists also queue them for upload. */
export function attachIds(state: WishlistState, idsByCode: Record<string, string>): WishlistState {
  let changed = false;
  const added: string[] = [];
  const entries = state.entries.map((entry) => {
    const id = idsByCode[entry.code];
    if (entry.id || !id) return entry;
    changed = true;
    added.push(id);
    return { ...entry, id };
  });
  if (!changed) return state;
  return {
    ...state,
    entries,
    pendingAdd: state.owner ? [...new Set([...state.pendingAdd, ...added])] : state.pendingAdd,
  };
}

/** Hands a guest list to the account that just signed in, so its items are uploaded rather than lost. */
export function adoptGuestList(state: WishlistState, owner: string): WishlistState {
  const ids = state.entries.map((entry) => entry.id).filter(isText);
  return { owner, entries: state.entries, pendingAdd: [...new Set(ids)], pendingRemove: [] };
}

/**
 * The account is the source of truth, adjusted by local changes that have not reached it yet.
 * Entries without an id cannot exist remotely, so they are kept until an id is found.
 */
export function mergeRemote(state: WishlistState, remote: RemoteWishlistRow[]): WishlistState {
  const local = new Map(state.entries.map((entry) => [entry.code, entry]));
  const fromRemote = remote
    .filter((row) => !state.pendingRemove.includes(row.id))
    .map((row) => ({ code: row.code, id: row.id, addedAt: row.addedAt, size: local.get(row.code)?.size }));
  const remoteIds = new Set(remote.map((row) => row.id));
  const unsent = state.entries.filter((entry) => !entry.id || (state.pendingAdd.includes(entry.id) && !remoteIds.has(entry.id)));
  return { ...state, entries: uniqueByCode([...unsent, ...fromRemote]) };
}

export function settlePending(state: WishlistState, sent: { added: string[]; removed: string[] }): WishlistState {
  return {
    ...state,
    pendingAdd: state.pendingAdd.filter((id) => !sent.added.includes(id)),
    pendingRemove: state.pendingRemove.filter((id) => !sent.removed.includes(id)),
  };
}
