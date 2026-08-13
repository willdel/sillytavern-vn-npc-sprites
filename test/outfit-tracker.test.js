import test from 'node:test';
import assert from 'node:assert/strict';
import { detectOutfits, parseOutfitDefinitions, updateOutfitStates } from '../modules/outfit-tracker.js';

const definitions = parseOutfitDefinitions('casual | 10 = jeans\nswimwear | 60 = bikini, swimsuit\nnude | 100 = naked');

test('detects a named character outfit and applies priority', () => {
  assert.deepEqual(detectOutfits('Laura removes her jeans and changes into a bikini.', [{ name: 'Laura' }], definitions), [{ name: 'Laura', label: 'swimwear' }]);
});

test('does not attribute another character outfit in a multi-character scene', () => {
  assert.deepEqual(detectOutfits('Laura wears a swimsuit.', [{ name: 'Laura' }, { name: 'Sadie' }], definitions), [{ name: 'Laura', label: 'swimwear' }]);
});

test('outfits persist and new roster members receive the default', () => {
  assert.deepEqual(updateOutfitStates({ Laura: 'uniform' }, ['Laura', 'Sadie'], [], 'casual'), { Laura: 'uniform', Sadie: 'casual' });
});

