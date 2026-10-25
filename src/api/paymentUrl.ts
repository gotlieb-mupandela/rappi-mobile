/**
 * Hosts the in-app browser may open for checkout.
 *
 * www.rappisportshub.com is the store host named in mobile-app.md and eas.json.
 * secure.3gdirectpay.com is the DPO Pay hosted payment page (pay.asp and payv3.php).
 * This repository never names that DPO host, so it is an assumption from DPO's public docs.
 */
export const PAYMENT_PAGE_HOSTS = ['www.rappisportshub.com', 'secure.3gdirectpay.com'] as const;

export const PAYMENT_URL_ERROR = 'This payment page is not from a known payment host.';

export class PaymentUrlError extends Error {
  constructor() {
    super(PAYMENT_URL_ERROR);
    this.name = 'PaymentUrlError';
  }
}

function hostAllowed(hostname: string): boolean {
  for (const host of PAYMENT_PAGE_HOSTS) {
    if (hostname === host) return true;
  }
  return false;
}

/** True only for https URLs whose hostname is exactly an allowlisted payment host. */
export function isAllowedPaymentUrl(paymentUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(paymentUrl);
  } catch {
    return false;
  }
  return parsed.protocol === 'https:' && hostAllowed(parsed.hostname);
}
