import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createQueuedJsonWriter, readStoredJson } from '@/src/lib/deviceStorage';
import { linesAfterStockError } from '@/src/lib/bagRules';

export type BagLine = {
  code: string;
  size: string;
  qty: number;
  name: string;
  imageUrl: string;
  price: number;
};

const KEY = 'bag';
const writeBag = createQueuedJsonWriter(KEY);

function clampQty(qty: number): number {
  return Math.min(99, Math.max(1, Math.round(qty)));
}

async function readBag(): Promise<BagLine[]> {
  const parsed = await readStoredJson<unknown>(KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (line): line is BagLine =>
        !!line &&
        typeof line === 'object' &&
        typeof line.code === 'string' &&
        typeof line.size === 'string' &&
        typeof line.name === 'string' &&
        typeof line.imageUrl === 'string' &&
        typeof line.qty === 'number' &&
        Number.isFinite(line.qty) &&
        line.qty > 0 &&
        typeof line.price === 'number' &&
        Number.isFinite(line.price) &&
        line.price >= 0,
    )
    .map((line) => ({ ...line, qty: clampQty(line.qty) }));
}

type BagContextValue = {
  lines: BagLine[];
  ready: boolean;
  totalQty: number;
  subtotal: number;
  add: (line: Omit<BagLine, 'qty'> & { qty?: number }) => void;
  setQty: (code: string, size: string, qty: number) => void;
  remove: (code: string, size: string) => void;
  applyStockError: (message: string) => void;
  clear: () => void;
};

const BagContext = createContext<BagContextValue | null>(null);

export function BagProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<BagLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    readBag().then((next) => {
      setLines(next);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) writeBag(lines);
  }, [lines, ready]);

  const add = useCallback<BagContextValue['add']>((line) => {
    const qty = clampQty(line.qty ?? 1);
    setLines((prev) => {
      const index = prev.findIndex((item) => item.code === line.code && item.size === line.size);
      if (index < 0) return [...prev, { ...line, qty }];
      const next = [...prev];
      next[index] = { ...next[index], ...line, qty: clampQty(next[index].qty + qty) };
      return next;
    });
  }, []);

  const setQty = useCallback<BagContextValue['setQty']>((code, size, qty) => {
    setLines((prev) => prev.map((item) => (item.code === code && item.size === size ? { ...item, qty: clampQty(qty) } : item)));
  }, []);

  const remove = useCallback<BagContextValue['remove']>((code, size) => {
    setLines((prev) => prev.filter((item) => !(item.code === code && item.size === size)));
  }, []);

  const applyStockError = useCallback<BagContextValue['applyStockError']>((message) => {
    setLines((prev) => linesAfterStockError(prev, message));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<BagContextValue>(
    () => ({
      lines,
      ready,
      totalQty: lines.reduce((sum, item) => sum + item.qty, 0),
      subtotal: lines.reduce((sum, item) => sum + item.price * item.qty, 0),
      add,
      setQty,
      remove,
      applyStockError,
      clear,
    }),
    [add, applyStockError, clear, lines, ready, remove, setQty],
  );

  return createElement(BagContext.Provider, { value }, children);
}

export function useBag(): BagContextValue {
  const value = useContext(BagContext);
  if (!value) throw new Error('useBag must be used inside BagProvider');
  return value;
}
