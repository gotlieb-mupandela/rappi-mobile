import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { fetchPaymentStatus } from '@/src/api/checkout';
import { useAuth } from '@/src/lib/auth';
import { useBag } from '@/src/lib/bag';

const KEY = 'pendingPayment';
/** DPO payment pages expire long before this; older records are only noise. */
const MAX_AGE_MS = 24 * 60 * 60_000;

export type PendingPayment = { companyRef: string; userId: string; startedAt: number };

type PendingPaymentValue = {
  /** A payment this user started that the server hasn't confirmed or rejected yet. */
  pending: PendingPayment | null;
  checking: boolean;
  /** Records the payment before the payment page opens, so it survives the app being killed. */
  start: (companyRef: string) => Promise<void>;
  /** Called when the checkout screen has its own answer: drop the record unless the outcome is still unknown. */
  finish: (outcome: 'settled' | 'unknown') => void;
  recheck: () => Promise<void>;
};

const PendingPaymentContext = createContext<PendingPaymentValue | null>(null);

function parse(raw: string | null): PendingPayment | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<PendingPayment>;
    if (typeof value.companyRef !== 'string' || typeof value.userId !== 'string' || typeof value.startedAt !== 'number') {
      return null;
    }
    if (Date.now() - value.startedAt > MAX_AGE_MS) return null;
    return { companyRef: value.companyRef, userId: value.userId, startedAt: value.startedAt };
  } catch {
    return null;
  }
}

export function PendingPaymentProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const userId = user?.id ?? null;
  const { clear: clearBag } = useBag();
  const [stored, setStored] = useState<PendingPayment | null>(null);
  const [checking, setChecking] = useState(false);
  const storedRef = useRef<PendingPayment | null>(null);
  /** The checkout screen is polling this payment itself; a second check would navigate twice. */
  const activeRef = useRef(false);

  const save = useCallback((next: PendingPayment | null) => {
    storedRef.current = next;
    setStored(next);
    void (next ? AsyncStorage.setItem(KEY, JSON.stringify(next)) : AsyncStorage.removeItem(KEY)).catch(() => undefined);
  }, []);

  const recheck = useCallback(async () => {
    const current = storedRef.current;
    if (!current || activeRef.current || current.userId !== userId) return;
    setChecking(true);
    try {
      const payment = await fetchPaymentStatus(current.companyRef).catch(() => null);
      if (storedRef.current?.companyRef !== current.companyRef || activeRef.current) return;
      if (payment?.status === 'paid') {
        save(null);
        clearBag();
        router.push({
          pathname: '/checkout/result',
          params: { status: 'paid', ref: current.companyRef, orderId: payment.orderId ?? '' },
        });
      } else if (payment?.status === 'cancelled' || payment?.status === 'failed' || payment?.status === 'error') {
        save(null);
      }
    } finally {
      setChecking(false);
    }
  }, [clearBag, save, userId]);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (cancelled) return;
        const value = parse(raw);
        storedRef.current = value;
        setStored(value);
        if (!value) void AsyncStorage.removeItem(KEY).catch(() => undefined);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const storedCompanyRef = stored?.companyRef;
  useEffect(() => {
    if (!authReady || !userId || !storedCompanyRef) return;
    void recheck();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void recheck();
    });
    return () => sub.remove();
  }, [authReady, recheck, storedCompanyRef, userId]);

  const start = useCallback(
    async (companyRef: string) => {
      if (!userId) return;
      activeRef.current = true;
      const next = { companyRef, userId, startedAt: Date.now() };
      storedRef.current = next;
      setStored(next);
      await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
    },
    [userId],
  );

  const finish = useCallback<PendingPaymentValue['finish']>(
    (outcome) => {
      activeRef.current = false;
      if (outcome === 'settled') save(null);
    },
    [save],
  );

  const value = useMemo<PendingPaymentValue>(
    () => ({ pending: stored && stored.userId === userId ? stored : null, checking, start, finish, recheck }),
    [checking, finish, recheck, start, stored, userId],
  );
  return <PendingPaymentContext.Provider value={value}>{children}</PendingPaymentContext.Provider>;
}

export function usePendingPayment(): PendingPaymentValue {
  const value = useContext(PendingPaymentContext);
  if (!value) throw new Error('usePendingPayment must be used inside PendingPaymentProvider');
  return value;
}
