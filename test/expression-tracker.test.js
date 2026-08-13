import test from 'node:test';
import assert from 'node:assert/strict';
import { expressionSamples, updateExpressionStates } from '../modules/expression-tracker.js';

test('extracts named character samples and ignores internal metadata', () => {
  const text = 'Jade smiles warmly. Sheri frowns at the door.\n\nINTERNAL STATES\nJade: angry';
  const samples = expressionSamples(text, ['Jade', 'Sheri']);
  assert.equal(samples.get('Jade'), 'Jade smiles warmly.');
  assert.equal(samples.get('Sheri'), 'Sheri frowns at the door.');
});

test('expression state persists and updates independently per character', () => {
  const first = updateExpressionStates({}, ['Jade', 'Sheri'], [{ name: 'Jade', label: 'joy' }, { name: 'Sheri', label: 'sadness' }]);
  const second = updateExpressionStates(first, ['Jade', 'Sheri'], [{ name: 'Jade', label: 'anger' }]);
  assert.deepEqual(second, { Jade: 'anger', Sheri: 'sadness' });
});

test('expression state is removed when a character leaves', () => {
  assert.deepEqual(updateExpressionStates({ Jade: 'joy', Sheri: 'anger' }, ['Jade'], []), { Jade: 'joy' });
});
