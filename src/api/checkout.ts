import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { apiFetch } from '@/src/api/client';
import type { CreatePaymentBody, CreatePaymentSuccess } from '@/src/api/types';

export async function createPayment(body: CreatePaymentBody): Promise<CreatePaymentSuccess> {
  return apiFetch<CreatePaymentSuccess>('/api/payments/dpo/create', {
    method: 'POST',
    auth: true,
    body,
    fallbackMessage: "Payment couldn't be started. Try again.",
  });
}

export type PaymentStatus = {
  status: string;
  orderId: string | null;
};

export async function fetchPaymentStatus(companyRef: string): Promise<PaymentStatus> {
  return apiFetch<PaymentStatus>(
    `/api/payments/dpo/status?companyRef=${encodeURIComponent(companyRef)}`,
    {
      auth: true,
      cache: 'no-store',
      fallbackMessage: "Payment couldn't be confirmed yet.",
    },
  );
}

export async function waitForPaidPayment(
  companyRef: string,
  attempts = 10,
  delayMs = 1250,
): Promise<PaymentStatus | null> {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const payment = await fetchPaymentStatus(companyRef);
      if (payment.status === 'paid') return payment;
      if (payment.status === 'cancelled' || payment.status === 'failed' || payment.status === 'error') {
        return payment;
      }
    } catch {
      // The return page or webhook may still be verifying the transaction.
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

export type BrowserOutcome = 'return' | 'cancel' | 'closed';

function outcomeFromUrl(url: string | undefined): BrowserOutcome {
  if (!url) return 'closed';
  if (url.includes('/checkout/return') || url.includes('checkout/return')) return 'return';
  if (url.includes('/checkout/cancel') || url.includes('checkout/cancel')) return 'cancel';
  return 'closed';
}

/**
 * Resolves once the customer is back in the app. The website's /checkout/return page must load in full,
 * so https navigation is never intercepted; a `rappisport://checkout/...` redirect is honoured on Android.
 * iOS avoids the auth-session "wants to sign in" prompt by using a plain Safari view.
 */
export async function openPaymentPage(paymentUrl: string): Promise<BrowserOutcome> {
  if (Platform.OS === 'ios') {
    await WebBrowser.openBrowserAsync(paymentUrl, { dismissButtonStyle: 'close' });
    return 'closed';
  }
  const result = await WebBrowser.openAuthSessionAsync(paymentUrl, 'rappisport://checkout', { showInRecents: true });
  return result.type === 'success' ? outcomeFromUrl(result.url) : 'closed';
}
