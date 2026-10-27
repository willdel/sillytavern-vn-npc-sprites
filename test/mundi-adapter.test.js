import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMundiCharacterNames } from '../modules/mundi-adapter.js';

const characters = [
  { name: 'Blaire', avatar: 'Blaire.png' },
  { name: 'Elle', avatar: 'Elle.webp' },
];

test('maps Mundi sprite avatar identifiers to character card names', () => {
  assert.deepEqual(resolveMundiCharacterNames({ avatarIds: ['Elle.webp', 'Blaire.png'], characters }), ['Elle', 'Blaire']);
});

test('combines visible people names without duplicates', () => {
  assert.deepEqual(resolveMundiCharacterNames({ avatarIds: ['Blaire.png'], visibleNames: ['blaire', 'Elle'], characters }), ['Blaire', 'Elle']);
});

test('uses the current one-on-one character only when no visible roster is available', () => {
  assert.deepEqual(resolveMundiCharacterNames({ characters, currentCharacter: characters[1] }), ['Elle']);
  assert.deepEqual(resolveMundiCharacterNames({ visibleNames: ['Blaire'], characters, currentCharacter: characters[1] }), ['Blaire']);
});
