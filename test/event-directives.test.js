import test from 'node:test';
import assert from 'node:assert/strict';
import { eventSpriteLabel, eventVideoFilename, eventVideoPath, isEventVideoRequest, listEventSprites, matchingVideoPath, parseEventDirectives, resolveEventSprite, stripEventDirectives } from '../modules/event-directives.js';

test('parses quoted event attributes', () => {
  assert.deepEqual(parseEventDirectives('Story.\n<vn-event character="Elle" image="special_dance">'), [{
    character: 'Elle', image: 'special_dance', raw: '<vn-event character="Elle" image="special_dance">', index: 7,
  }]);
});

test('builds safe direct paths for MP4 event videos', () => {
  assert.equal(isEventVideoRequest('special_dance.mp4'), true);
  assert.equal(eventVideoFilename('special_dance.mp4'), 'event_special_dance.mp4');
  assert.equal(eventVideoFilename('../special_dance.mp4'), 'event_special_dance.mp4');
  assert.equal(eventVideoFilename('bad.exe'), '');
  assert.equal(eventVideoPath('Elle Smith', 'event_special_dance.mp4'), '/characters/Elle%20Smith/event_special_dance.mp4');
});

test('derives a matching MP4 path from a discoverable poster sprite', () => {
  assert.equal(matchingVideoPath('/characters/Elle/event_dance.webp?t=123'), '/characters/Elle/event_dance.mp4');
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

