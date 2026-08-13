import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidates, detectNpc, detectNpcs, parseAliases } from '../modules/detection.js';

const characters = [{ name: 'Shannon', avatar: 'Shannon.png' }, { name: 'Ann', avatar: 'Ann.png' }];

test('detects an explicit speaker deterministically', () => {
  const result = detectNpc('Shannon: "Hello."', buildCandidates(characters));
  assert.equal(result.name, 'Shannon');
  assert.equal(result.reason, 'explicit-speaker');
});

test('does not match a name inside another word', () => {
  assert.equal(detectNpc('The annual party started.', buildCandidates(characters)), null);
});

test('uses a unique mention as graceful fallback', () => {
  assert.equal(detectNpc('Shannon puts the papers aside.', buildCandidates(characters)).reason, 'unique-mention');
  assert.equal(detectNpc('Shannon waves to Ann.', buildCandidates(characters)), null);
});

test('aliases resolve to existing character cards', () => {
  assert.equal(parseAliases('Ms. Carter = Shannon').get('Ms. Carter'), 'Shannon');
  assert.equal(detectNpc('Ms. Carter â€” Sit down.', buildCandidates(characters, 'Ms. Carter = Shannon')).name, 'Shannon');
});

test('ignores internal state metadata when resolving visible narration', () => {
  const candidates = buildCandidates([...characters, { name: 'Sadie', avatar: 'Sadie.png' }, { name: 'Tessa', avatar: 'Tessa.png' }]);
  const text = 'Sadie looks back at you.\n\nðŸŽ¬ INTERNAL STATES (Turn: 2)\n-Sadie | Circle: Tessa social circle';
  const result = detectNpc(text, candidates);
  assert.equal(result.name, 'Sadie');
  assert.equal(result.reason, 'unique-mention');
});

test('returns multiple visible characters and prioritizes an explicit speaker', () => {
  const candidates = buildCandidates([...characters, { name: 'Sadie' }, { name: 'Laura' }]);
  const result = detectNpcs('Sadie waits by the door.\nLaura: â€œReady?â€', candidates);
  assert.deepEqual(result.characters.map(item => item.name), ['Sadie', 'Laura']);
  assert.equal(result.activeSpeaker.name, 'Laura');
});

test('caps a scene roster at five characters', () => {
  const names = ['One', 'Two', 'Three', 'Four', 'Five', 'Six'];
  const result = detectNpcs(names.join(', '), buildCandidates(names.map(name => ({ name }))));
  assert.equal(result.characters.length, 5);
});
