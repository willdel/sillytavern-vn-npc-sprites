import test from 'node:test';
import assert from 'node:assert/strict';
import { formatInteractionMessage, parseInteractionDefinitions } from '../modules/interactions.js';

test('parses manual interaction definitions', () => {
  assert.deepEqual(parseInteractionDefinitions('Hug | hug | I hug {character}.\n# comment\nInvalid | row'), [
    { label: 'Hug', image: 'hug', template: 'I hug {character}.' },
  ]);
});

test('requires a character placeholder', () => {
  assert.deepEqual(parseInteractionDefinitions('Hug | hug | I hug someone.'), []);
});

test('replaces every character placeholder', () => {
  assert.equal(formatInteractionMessage('{character}, I hug {character}.', 'Tess'), 'Tess, I hug Tess.');
});
