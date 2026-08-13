import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidates, detectNpc, parseAliases } from '../modules/detection.js';

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
  assert.equal(detectNpc('Ms. Carter — Sit down.', buildCandidates(characters, 'Ms. Carter = Shannon')).name, 'Shannon');
});
