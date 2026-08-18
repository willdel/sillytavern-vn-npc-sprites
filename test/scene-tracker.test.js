import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidates } from '../modules/detection.js';
import { analyzeScene, extractLocation, updateScene } from '../modules/scene-tracker.js';

const candidates = buildCandidates(['Sadie', 'Laura', 'Tessa'].map(name => ({ name })));

test('ordinary conversational mentions do not add a character', () => {
  const analysis = analyzeScene('Laura tells you that Sadie works at the boutique.', candidates);
  assert.deepEqual(analysis.entrances.map(item => item.name), []);
});

test('detects multiple physically present characters but not a remote business owner', () => {
  const text = 'Sheri watches Jade from the rocks. Jade walks a few steps closer. Bunny runs the cafe downtown. Jade pivots toward you.';
  const sceneCandidates = buildCandidates(['Sheri', 'Jade', 'Bunny'].map(name => ({ name })));
  const analysis = analyzeScene(text, sceneCandidates);
  assert.deepEqual(analysis.entrances.map(item => item.name), ['Sheri', 'Jade']);
});

test('does not confuse a lowercase color with a character named Amber', () => {
  const colorCandidates = buildCandidates(['Tessa', 'Riley', 'Amber'].map(name => ({ name })));
  const text = 'Tessa rolls her bracelet once, catching the amber light from the pastry case. Riley tilts her head.';
  const analysis = analyzeScene(text, colorCandidates);
  assert.deepEqual(analysis.entrances.map(item => item.name), ['Tessa', 'Riley']);
});

test('physical action adds a character and an exit removes one', () => {
  const entered = updateScene({ roster: [], location: null }, analyzeScene('Sadie taps her phone and looks at you.', candidates));
  assert.deepEqual(entered.roster, ['Sadie']);
  const exited = updateScene(entered, analyzeScene('Sadie walks away toward the street.', candidates));
  assert.deepEqual(exited.roster, []);
});

test('explicit dialogue adds and prioritizes the speaker', () => {
  const result = updateScene({ roster: ['Sadie'], location: null }, analyzeScene('Laura: â€œAre you ready?â€', candidates));
  assert.deepEqual(result.roster, ['Sadie', 'Laura']);
  assert.equal(result.activeSpeaker, 'Laura');
});

test('combined user and narrator text can describe a handoff', () => {
  const text = 'I wave goodbye to Sadie. I look over to see my neighbor, Laura.\nLaura stands in her doorway.';
  const result = updateScene({ roster: ['Sadie'], location: null }, analyzeScene(text, candidates));
  assert.deepEqual(result.roster, ['Laura']);
});

test('internal metadata does not add remote names', () => {
  const analysis = analyzeScene('Sadie smiles.\n\nðŸŽ¬ INTERNAL STATES\n-Sadie | Circle: Tessa', candidates);
  assert.deepEqual(analysis.entrances.map(item => item.name), ['Sadie']);
});

test('a location change resets the previous roster', () => {
  const text = '[ Time 10:30 | ðŸ“ Location: Pool Courtyard | Sunny ]\nLaura stands by the gate.';
  assert.equal(extractLocation(text), 'Pool Courtyard');
  const result = updateScene({ roster: ['Sadie'], location: 'Apartment 214' }, analyzeScene(text, candidates));
  assert.deepEqual(result.roster, ['Laura']);
  assert.equal(result.locationChanged, true);
});

test('extracts a pin-only Location header without the Location label', () => {
  const text = '**[ Time 5:22 PM | \u{1F4CD} Apartment - Kitchen | Clear ]**';
  assert.equal(extractLocation(text), 'Apartment - Kitchen');
});

test('scene roster remains capped at five', () => {
  const result = updateScene({ roster: ['One', 'Two', 'Three', 'Four', 'Five'], location: null }, {
    entrances: [{ name: 'Six' }], exits: [], activeSpeaker: null, location: null,
  });
  assert.deepEqual(result.roster, ['Two', 'Three', 'Four', 'Five', 'Six']);
});

