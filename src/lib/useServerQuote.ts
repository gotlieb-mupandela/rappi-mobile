import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchCartPrices, fetchCheckoutQuote } from '@/src/api/quote';
import {
  cartInputKey,
  checkoutInputKey,
  createQuoteRefreshTimer,
  quoteFailureCode,
  quoteRequestDelay,
  type CartPrices,
  type CheckoutQuote,
  type QuoteFailureCode,
  type QuoteLineInput,
  type QuoteRefreshTimer,
} from '@/src/lib/serverQuote';

type CartState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  inputKey: string;
  data: CartPrices | null;
  failureCode: QuoteFailureCode | null;
};

type CheckoutState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  inputKey: string;
  quoteKey: string | null;
  data: CheckoutQuote | null;
  freshForPay: boolean;
  failureCode: QuoteFailureCode | null;
};

function useRefreshTimer(): QuoteRefreshTimer {
  const timerRef = useRef<QuoteRefreshTimer | null>(null);
  if (!timerRef.current) {
    timerRef.current = createQuoteRefreshTimer(
      (run, delayMs) => setTimeout(run, delayMs),
      (handle) => clearTimeout(handle),
    );
  }
  return timerRef.current;
}

export function useCartPrices(lines: readonly QuoteLineInput[], enabled: boolean) {
  const inputKey = cartInputKey(lines);
  const linesRef = useRef(lines);
  linesRef.current = lines;
  const timer = useRefreshTimer();
  const [attempt, setAttempt] = useState(0);
  const [focusNonce, setFocusNonce] = useState(0);
  const [debouncePending, setDebouncePending] = useState(false);
  const [state, setState] = useState<CartState>({ status: 'idle', inputKey, data: null, failureCode: null });
  const prev = useRef({ inputKey: null as string | null, attempt: 0, enabled: false, focusNonce: 0 });

  useEffect(() => {
    const hasLines = linesRef.current.length > 0;
    const inputChanged = prev.current.inputKey !== inputKey;
    const retrying = prev.current.attempt !== attempt;
    const becameEnabled = enabled && !prev.current.enabled;
    const focusRefresh = prev.current.focusNonce !== focusNonce;
    prev.current = { inputKey, attempt, enabled, focusNonce };
    const delay = quoteRequestDelay({
      enabled,
      hasLines,
      inputChanged,
      becameReady: false,
      retrying,
      becameEnabled,
      focusRefresh,
    });
    if (delay === null) return;

    let cancelled = false;
    const start = () => {
      setDebouncePending(false);
      setState({ status: 'loading', inputKey, data: null, failureCode: null });
      void fetchCartPrices(linesRef.current)
        .then((data) => {
          if (!cancelled) setState({ status: 'ready', inputKey, data, failureCode: null });
        })
        .catch((error: unknown) => {
          if (!cancelled) setState({ status: 'error', inputKey, data: null, failureCode: quoteFailureCode(error) });
        });
    };

    if (delay === 0) {
      timer.cancel();
      start();
      return () => {
        cancelled = true;
      };
    }

    setDebouncePending(true);
    setState({ status: 'loading', inputKey, data: null, failureCode: null });
    timer.schedule(delay, () => {
      if (!cancelled) start();
    });
    return () => {
      cancelled = true;
      timer.cancel();
    };
  }, [attempt, enabled, focusNonce, inputKey, timer]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const refreshOnFocus = useCallback(() => setFocusNonce((value) => value + 1), []);
  return { ...state, requestKey: inputKey, debouncePending, retry, refreshOnFocus };
}

export function useCheckoutQuote(options: {
  enabled: boolean;
  lines: readonly QuoteLineInput[];
  shippingMethod: string;
  country: string;
  formReady: boolean;
}) {
  const { enabled, lines, shippingMethod, country, formReady } = options;
  const inputKey = checkoutInputKey(lines, shippingMethod, country);
  const linesRef = useRef(lines);
  const shippingRef = useRef(shippingMethod);
  const countryRef = useRef(country);
  const formReadyRef = useRef(formReady);
  linesRef.current = lines;
  shippingRef.current = shippingMethod;
  countryRef.current = country;
  formReadyRef.current = formReady;
  const timer = useRefreshTimer();

  const [attempt, setAttempt] = useState(0);
  const [debouncePending, setDebouncePending] = useState(false);
  const [state, setState] = useState<CheckoutState>({
    status: 'idle',
    inputKey,
    quoteKey: null,
    data: null,
    freshForPay: false,
    failureCode: null,
  });
  const prev = useRef({ inputKey: null as string | null, formReady: false, attempt: 0, enabled: false });

  useEffect(() => {
    const hasLines = linesRef.current.length > 0;
    const inputChanged = prev.current.inputKey !== inputKey;
    const becameReady = formReady && !prev.current.formReady;
    const retrying = prev.current.attempt !== attempt;
    const becameEnabled = enabled && !prev.current.enabled;
    prev.current = { inputKey, formReady, attempt, enabled };
    const delay = quoteRequestDelay({
      enabled,
      hasLines,
      inputChanged,
      becameReady,
      retrying,
      becameEnabled,
      focusRefresh: false,
    });
    if (delay === null) return;

    const startedReady = formReadyRef.current;
    let cancelled = false;
    const start = () => {
      setDebouncePending(false);
      setState({ status: 'loading', inputKey, quoteKey: inputKey, data: null, freshForPay: false, failureCode: null });
      void fetchCheckoutQuote(linesRef.current, shippingRef.current, countryRef.current)
        .then((data) => {
          if (cancelled) return;
          setState({
            status: 'ready',
            inputKey,
            quoteKey: inputKey,
            data,
            freshForPay: startedReady,
            failureCode: null,
          });
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setState({
            status: 'error',
            inputKey,
            quoteKey: inputKey,
            data: null,
            freshForPay: false,
            failureCode: quoteFailureCode(error),
          });
        });
    };

    if (delay === 0) {
      timer.cancel();
      start();
      return () => {
        cancelled = true;
      };
    }

    setDebouncePending(true);
    setState({ status: 'loading', inputKey, quoteKey: null, data: null, freshForPay: false, failureCode: null });
    timer.schedule(delay, () => {
      if (!cancelled) start();
    });
    return () => {
      cancelled = true;
      timer.cancel();
    };
  }, [attempt, country, enabled, formReady, inputKey, shippingMethod, timer]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...state, requestKey: inputKey, debouncePending, retry };
}
