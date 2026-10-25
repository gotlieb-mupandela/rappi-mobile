/** apiFetch sends `Authorization: Bearer <signed-in access token>` when auth is true. */
export const PAYMENT_STATUS_AUTH = true as const;

export type PaymentView = 'paid' | 'pending' | 'failed';

/**
 * Status request for the company reference stored when this app created the payment.
 * The link's status, order id, and reference are not arguments and are not sent.
 * The query is only `companyRef`. No prices are sent.
 */
export function paymentStatusRequest(storedCompanyRef: string | null | undefined): { path: string; auth: typeof PAYMENT_STATUS_AUTH } | null {
  if (typeof storedCompanyRef !== 'string' || storedCompanyRef.length === 0) return null;
  return {
    path: `/api/payments/dpo/status?companyRef=${encodeURIComponent(storedCompanyRef)}`,
    auth: PAYMENT_STATUS_AUTH,
  };
}

/** Maps the server status. A link that says paid is not an input. */
export function viewForServerStatus(status: string | null | undefined): PaymentView {
  if (status === 'paid') return 'paid';
  if (status === 'failed' || status === 'error' || status === 'cancelled') return 'failed';
  return 'pending';
}
