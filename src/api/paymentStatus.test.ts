import assert from 'node:assert/strict';
import test from 'node:test';

import { PAYMENT_STATUS_AUTH, paymentStatusRequest, viewForServerStatus } from './paymentStatus.ts';

test('status request uses the app-created company reference and the bearer flag', () => {
  const storedCompanyRef = 'company-ref-created-by-this-app';
  const linkStatus = 'paid';
  const linkOrderId = '11111111-1111-4111-8111-111111111111';
  const linkCompanyRef = 'ref-taken-from-the-link';
  const request = paymentStatusRequest(storedCompanyRef);

  assert.ok(request);
  assert.equal(request.auth, true);
  assert.equal(PAYMENT_STATUS_AUTH, true);
  assert.equal(request.path, `/api/payments/dpo/status?companyRef=${encodeURIComponent(storedCompanyRef)}`);

  const params = new URL(request.path, 'https://www.rappisportshub.com').searchParams;
  assert.deepEqual([...params.keys()], ['companyRef']);
  assert.equal(params.get('companyRef'), storedCompanyRef);
  assert.equal(params.has('price'), false);
  assert.equal(params.has('amount'), false);
  assert.equal(params.has('total'), false);
  assert.equal(request.path.includes(linkOrderId), false);
  assert.equal(request.path.includes(linkCompanyRef), false);
  assert.equal(request.path.includes(`status=${linkStatus}`), false);
});

test('a paid link does not create a status request when this app has no stored reference', () => {
  assert.equal(paymentStatusRequest(null), null);
  assert.equal(paymentStatusRequest(undefined), null);
  assert.equal(paymentStatusRequest(''), null);
});

test('paid, pending, and failed come from the server status', () => {
  assert.equal(viewForServerStatus('paid'), 'paid');
  assert.equal(viewForServerStatus('pending'), 'pending');
  assert.equal(viewForServerStatus('created'), 'pending');
  assert.equal(viewForServerStatus('failed'), 'failed');
  assert.equal(viewForServerStatus('error'), 'failed');
  assert.equal(viewForServerStatus('cancelled'), 'failed');
  assert.equal(viewForServerStatus('paid-not-really'), 'pending');
  assert.equal(viewForServerStatus(null), 'pending');
});
