import assert from 'node:assert/strict';
import test from 'node:test';

import { isAllowedPaymentUrl, PAYMENT_PAGE_HOSTS, PAYMENT_URL_ERROR, PaymentUrlError } from './paymentUrl.ts';

const DPO = 'secure.3gdirectpay.com';
const STORE = 'www.rappisportshub.com';

test('allowlist is the store host and the DPO payment host', () => {
  assert.deepEqual(PAYMENT_PAGE_HOSTS, [STORE, DPO]);
});

test('allows https URLs whose hostname is exactly an allowlisted host', () => {
  assert.equal(isAllowedPaymentUrl(`https://${DPO}/pay.asp?ID=token`), true);
  assert.equal(isAllowedPaymentUrl(`https://${DPO}/payv3.php?ID=token`), true);
  assert.equal(isAllowedPaymentUrl(`https://${STORE}/checkout/pay`), true);
  assert.equal(isAllowedPaymentUrl(`https://${STORE.toUpperCase()}/checkout/pay`), true);
  assert.equal(isAllowedPaymentUrl(`https://user:secret@${DPO}/pay.asp`), true);
});

test('rejects lookalike hosts, userinfo tricks, and non-https URLs', () => {
  const rejected = [
    `https://${DPO}.evil.com/pay.asp`,
    `https://pay.${STORE}.evil.com/pay`,
    'https://evilexample.com/',
    `https://${DPO}@evil.com/pay.asp`,
    `https://${STORE}@evil.com/checkout`,
    'https://good.com@evil.com/pay',
    `https://evil.com/?next=https://${DPO}/pay.asp`,
    `http://${DPO}/pay.asp?ID=token`,
    `http://${STORE}/checkout/pay`,
    `https://not${DPO}/pay.asp`,
    `https://pay.${DPO}/pay.asp`,
    'https://rappisportshub.com/checkout/pay',
    'rappisport://checkout?status=paid',
    'javascript:alert(1)',
    '',
    'not a url',
  ];
  for (const url of rejected) {
    assert.equal(isAllowedPaymentUrl(url), false, url);
  }
});

test('payment URL error is a clear message and does not include a URL', () => {
  const error = new PaymentUrlError();
  assert.equal(error.message, PAYMENT_URL_ERROR);
  assert.equal(error.message.includes('http'), false);
});
