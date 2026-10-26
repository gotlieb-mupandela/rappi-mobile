import assert from 'node:assert/strict';
import test from 'node:test';

import { ALLOWED_IMAGE_HOSTS, sanitizeImageUrl } from './images.ts';

const JOMA = 'https://www.joma-sport.com/on/demandware.static/Sites-joma-sport/images/medium/PACK25_1.jpg';
const SUPABASE = 'https://wzmzwerzbyudcvoiiege.supabase.co/storage/v1/object/public/product-images/shoe-1.jpg';
const SITE = 'https://www.rappisportshub.com/catalog-photos/plain-ok.jpg';
const V1 = 'https://v1.joma-sport.net/files/hiking.jpg';
const WSRV = 'https://wsrv.nl/?url=https%3A%2F%2Fwww.rappisportshub.com%2Fbrand%2Fkids.png';

test('keeps https URLs on the four web hosts and the canonical origin', () => {
  assert.equal(sanitizeImageUrl(JOMA), JOMA);
  assert.equal(sanitizeImageUrl(SUPABASE), SUPABASE);
  assert.equal(sanitizeImageUrl(SITE), SITE);
  assert.equal(sanitizeImageUrl(V1), V1);
  assert.equal(sanitizeImageUrl(WSRV), WSRV);
  assert.equal(ALLOWED_IMAGE_HOSTS.map((rule) => rule.host).join(','), [
    'wsrv.nl',
    'wzmzwerzbyudcvoiiege.supabase.co',
    'www.joma-sport.com',
    'v1.joma-sport.net',
    'www.rappisportshub.com',
  ].join(','));
});

test('drops relative, protocol-relative, http, off-host, and malformed URLs', () => {
  assert.equal(sanitizeImageUrl('/catalog-photos/relative.jpg'), null);
  assert.equal(sanitizeImageUrl('//www.rappisportshub.com/a.jpg'), null);
  assert.equal(sanitizeImageUrl('http://www.joma-sport.com/on/demandware.static/hidden.jpg'), null);
  assert.equal(sanitizeImageUrl('http://www.rappisportshub.com/catalog-photos/plain.jpg'), null);
  assert.equal(sanitizeImageUrl('https://evil.example/photo.jpg'), null);
  assert.equal(sanitizeImageUrl('https://rappisportshub.com/catalog-photos/plain.jpg'), null);
  assert.equal(sanitizeImageUrl('https://www.joma-sport.com/other/photo.jpg'), null);
  assert.equal(sanitizeImageUrl('https://v1.joma-sport.net/other/photo.jpg'), null);
  assert.equal(sanitizeImageUrl('https://wzmzwerzbyudcvoiiege.supabase.co/storage/v1/object/public/avatars/a.jpg'), null);
  assert.equal(sanitizeImageUrl('not a url'), null);
  assert.equal(sanitizeImageUrl(''), null);
  assert.equal(sanitizeImageUrl(null), null);
  assert.equal(sanitizeImageUrl('https://user:pass@www.rappisportshub.com/a.jpg'), null);
});
