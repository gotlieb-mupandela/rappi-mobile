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

test('rejects a port on every allowlisted host', () => {
  assert.equal(sanitizeImageUrl('https://wsrv.nl:8443/?url=https%3A%2F%2Fwww.rappisportshub.com%2Fa.png'), null);
  assert.equal(
    sanitizeImageUrl('https://wzmzwerzbyudcvoiiege.supabase.co:8443/storage/v1/object/public/product-images/shoe-1.jpg'),
    null,
  );
  assert.equal(sanitizeImageUrl('https://www.joma-sport.com:8443/on/demandware.static/Sites-joma-sport/a.jpg'), null);
  assert.equal(sanitizeImageUrl('https://v1.joma-sport.net:8443/files/hiking.jpg'), null);
  assert.equal(sanitizeImageUrl('https://www.rappisportshub.com:8443/catalog-photos/plain-ok.jpg'), null);
  assert.equal(sanitizeImageUrl('https://www.rappisportshub.com:443/catalog-photos/plain-ok.jpg'), SITE);
});

test('rejects userinfo, lookalike hosts, relative paths, and http', () => {
  assert.equal(sanitizeImageUrl('https://user:pass@www.rappisportshub.com/a.jpg'), null);
  assert.equal(sanitizeImageUrl('https://user@wsrv.nl/a.jpg'), null);
  assert.equal(sanitizeImageUrl('https://user:pass@www.joma-sport.com/on/demandware.static/a.jpg'), null);
  assert.equal(sanitizeImageUrl('https://wsrv.nl.evil.example/a.jpg'), null);
  assert.equal(sanitizeImageUrl('https://evilwsrv.nl/a.jpg'), null);
  assert.equal(sanitizeImageUrl('https://www.joma-sport.com.attacker.test/on/demandware.static/a.jpg'), null);
  assert.equal(sanitizeImageUrl('https://v1.joma-sport.net.evil.example/files/a.jpg'), null);
  assert.equal(
    sanitizeImageUrl('https://wzmzwerzbyudcvoiiege.supabase.co.evil.example/storage/v1/object/public/product-images/a.jpg'),
    null,
  );
  assert.equal(sanitizeImageUrl('https://www.rappisportshub.com.evil.example/a.jpg'), null);
  assert.equal(sanitizeImageUrl('https://evil.example/www.rappisportshub.com/x'), null);
  assert.equal(sanitizeImageUrl('/../x'), null);
  assert.equal(sanitizeImageUrl('/a\\b'), null);
  assert.equal(sanitizeImageUrl('https://host:8443/x'), null);
  assert.equal(sanitizeImageUrl('https://not.rappisportshub.com/a.jpg'), null);
  assert.equal(sanitizeImageUrl('/catalog-photos/relative.jpg'), null);
  assert.equal(sanitizeImageUrl('catalog-photos/relative.jpg'), null);
  assert.equal(sanitizeImageUrl('http://www.rappisportshub.com/catalog-photos/plain.jpg'), null);
  assert.equal(sanitizeImageUrl('http://wsrv.nl/a.jpg'), null);
  assert.equal(sanitizeImageUrl(`  ${SITE}  `), SITE);
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
