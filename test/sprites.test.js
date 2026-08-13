import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseSprite, getCardAvatarPath } from '../modules/sprites.js';

test('prefers a requested expression sprite', () => {
  const sprites = [{ label: 'neutral', path: '/neutral.png' }, { label: 'joy', path: '/joy.png' }];
  assert.equal(chooseSprite(sprites, 'joy').path, '/joy.png');
});

test('builds a full character-card avatar fallback path', () => {
  assert.equal(getCardAvatarPath({ avatar: 'Laura Card.png' }), '/characters/Laura%20Card.png');
  assert.equal(getCardAvatarPath({ avatar: 'none' }), null);
});
