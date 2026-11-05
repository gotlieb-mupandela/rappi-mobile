import assert from 'node:assert/strict';
import test from 'node:test';

import { contentPositionFor, parseObjectPosition, readImageFit, readObjectPosition, sameImageFile } from './crop.ts';

test('objectPosition strings become a content position and bad values are ignored', () => {
  assert.deepEqual(parseObjectPosition('50% 0%'), { left: '50%', top: '0%' });
  assert.deepEqual(parseObjectPosition('center 20%'), { left: '50%', top: '20%' });
  assert.deepEqual(parseObjectPosition('top center'), { left: '50%', top: '0%' });
  assert.equal(parseObjectPosition('top'), 'top');
  assert.equal(parseObjectPosition('center'), 'center');
  assert.equal(parseObjectPosition('nope'), null);
  assert.equal(readObjectPosition('  center   20% '), 'center 20%');
  assert.equal(readObjectPosition(12), null);
  assert.equal(readImageFit('cover'), 'cover');
  assert.equal(readImageFit('fill'), null);
  assert.equal(contentPositionFor(null, 'top'), 'top');
  assert.deepEqual(contentPositionFor('50% 0%', 'top'), { left: '50%', top: '0%' });
  assert.equal(
    sameImageFile(
      'https://www.rappisportshub.com/brand/hub-sportswear.png?v=1',
      'https://www.rappisportshub.com/brand/hub-sportswear.png?v=2',
    ),
    true,
  );
  assert.equal(
    sameImageFile(
      'https://www.rappisportshub.com/brand/audience-men.png?v=3',
      'https://www.rappisportshub.com/brand/hub-sportswear.png?v=1',
    ),
    false,
  );
});
