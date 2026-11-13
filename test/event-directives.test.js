import test from 'node:test';
import assert from 'node:assert/strict';
import { eventSlot, eventSpriteLabel, eventVideoFilename, eventVideoPath, isEventVideoRequest, listEventSprites, matchingVideoPaths, parseEventDirectives, resolveEventSprite, stripEventDirectives } from '../modules/event-directives.js';

test('parses quoted event attributes', () => {
  assert.deepEqual(parseEventDirectives('Story.\n<vn-event character="Elle" image="special_dance">'), [{
    character: 'Elle', image: 'special_dance', slot: 'right', raw: '<vn-event character="Elle" image="special_dance">', index: 7,
  }]);
});

test('parses an explicit left slot and defaults other values to right', () => {
  assert.equal(parseEventDirectives('<vn-event character="Blaire" image="dance" slot="left">')[0].slot, 'left');
  assert.equal(eventSlot('LEFT'), 'left');
  assert.equal(eventSlot('center'), 'right');
});

test('builds safe direct paths for MP4 and WebM event videos', () => {
  assert.equal(isEventVideoRequest('special_dance.mp4'), true);
  assert.equal(isEventVideoRequest('special_dance.webm'), true);
  assert.equal(eventVideoFilename('special_dance.mp4'), 'event_special_dance.mp4');
  assert.equal(eventVideoFilename('special_dance.webm'), 'event_special_dance.webm');
  assert.equal(eventVideoFilename('../special_dance.mp4'), 'event_special_dance.mp4');
  assert.equal(eventVideoFilename('bad.exe'), '');
  assert.equal(eventVideoPath('Elle Smith', 'event_special_dance.mp4'), '/characters/Elle%20Smith/event_special_dance.mp4');
  assert.equal(eventVideoPath('Elle Smith', 'special_dance.webm'), '/characters/Elle%20Smith/event_special_dance.webm');
});

test('derives matching WebM and MP4 paths from a discoverable poster sprite', () => {
  assert.deepEqual(matchingVideoPaths('/characters/Elle/event_dance.webp?t=123'), [
    '/characters/Elle/event_dance.webm',
    '/characters/Elle/event_dance.mp4',
  ]);
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

