import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseOutfitSprite, chooseSprite, getCardAvatarPath, matchingSpriteVideoPath } from '../modules/sprites.js';

test('prefers a requested expression sprite', () => {
  const sprites = [{ label: 'neutral', path: '/neutral.png' }, { label: 'joy', path: '/joy.png' }];
  assert.equal(chooseSprite(sprites, 'joy').path, '/joy.png');
});

test('falls back from a missing action to the current expression', () => {
  const sprites = [{ label: 'neutral', path: '/neutral.png' }, { label: 'joy', path: '/joy.png' }];
  assert.equal(chooseSprite(sprites, 'walking', ['joy']).path, '/joy.png');
});

test('builds a full character-card avatar fallback path', () => {
  assert.equal(getCardAvatarPath({ avatar: 'Laura Card.png' }), '/characters/Laura%20Card.png');
  assert.equal(getCardAvatarPath({ avatar: 'none' }), null);
});

test('prefers an outfit action then outfit expression', () => {
  const sprites = [{ label: 'swimwear_joy', path: '/outfit-joy.png' }, { label: 'joy', path: '/joy.png' }];
  assert.equal(chooseOutfitSprite(sprites, { outfit: 'swimwear', action: 'walking', expression: 'joy' }).path, '/outfit-joy.png');
});

test('uses unprefixed sprites for the default outfit', () => {
  const sprites = [{ label: 'casual_joy', path: '/wrong.png' }, { label: 'joy', path: '/joy.png' }];
  assert.equal(chooseOutfitSprite(sprites, { outfit: 'casual', defaultOutfit: 'casual', expression: 'joy' }).path, '/joy.png');
});

test('derives a same-named WebM path from a sprite poster', () => {
  assert.equal(matchingSpriteVideoPath('/characters/Tess/swimwear_dancing.webp'), '/characters/Tess/swimwear_dancing.webm');
  assert.equal(matchingSpriteVideoPath('/characters/Tess/joy.png?t=123'), '/characters/Tess/joy.webm?t=123');
  assert.equal(matchingSpriteVideoPath('/characters/Tess/no-extension'), '');
});

