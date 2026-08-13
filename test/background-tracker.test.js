import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLocation, parseBackgroundMappings, resolveBackground } from '../modules/background-tracker.js';

test('parses exact location-to-background mappings', () => {
  assert.deepEqual(parseBackgroundMappings('Bedroom = bedroom.webp\n# ignored\nCafe = cafe.png'), [
    { location: 'Bedroom', normalizedLocation: 'bedroom', file: 'bedroom.webp' },
    { location: 'Cafe', normalizedLocation: 'cafe', file: 'cafe.png' },
  ]);
});

test('matches case, spacing, and dash variants deterministically', () => {
  const mappings = parseBackgroundMappings('Driftline Beach - North Cove Path = north-cove.webp');
  assert.equal(resolveBackground('  DRIFTLINE   BEACH â€” North Cove Path ', mappings)?.file, 'north-cove.webp');
});

test('does not use partial or ordinary mention matching', () => {
  const mappings = parseBackgroundMappings('Bedroom = bedroom.webp');
  assert.equal(resolveBackground('Hallway outside the bedroom', mappings), null);
  assert.equal(normalizeLocation(' Bedroom '), 'bedroom');
});

