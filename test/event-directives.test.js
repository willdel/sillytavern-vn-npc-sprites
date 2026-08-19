import test from 'node:test';
import assert from 'node:assert/strict';
import { eventSpriteLabel, listEventSprites, parseEventDirectives, resolveEventSprite, stripEventDirectives } from '../modules/event-directives.js';

test('parses quoted event attributes', () => {
  assert.deepEqual(parseEventDirectives('Story.\n<vn-event character="Elle" image="special_dance">'), [{
    character: 'Elle', image: 'special_dance', raw: '<vn-event character="Elle" image="special_dance">', index: 7,
  }]);
});

test('strips event directives without changing stored prose', () => {
  assert.equal(stripEventDirectives('Story.\n<vn-event character="Elle" image="dance">'), 'Story.');
});

test('resolves only event-prefixed sprites', () => {
  const sprites = [{ label: 'dance', path: '/dance.webp' }, { label: 'event_special_dance', path: '/event.webp' }];
  assert.equal(eventSpriteLabel('special_dance'), 'event_special_dance');
  assert.equal(eventSpriteLabel('event_special_dance'), 'event_special_dance');
  assert.equal(resolveEventSprite(sprites, 'special_dance')?.path, '/event.webp');
  assert.deepEqual(listEventSprites(sprites).map(sprite => sprite.label), ['event_special_dance']);
  assert.equal(resolveEventSprite(sprites, 'dance'), null);
});

