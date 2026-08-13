import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLocation, parseBackgroundMappings, resolveBackground } from '../modules/background-tracker.js';

test('parses exact location-to-background mappings', () => {
  assert.deepEqual(parseBackgroundMappings('Bedroom = bedroom.webp\n# ignored\nCafe = cafe.png'), [
    { location: 'Bedroom', normalizedLocation: 'bedroom', terms: ['bedroom'], file: 'bedroom.webp' },
    { location: 'Cafe', normalizedLocation: 'cafe', terms: ['cafe'], file: 'cafe.png' },
  ]);
});

test('matches case, spacing, and dash variants deterministically', () => {
  const mappings = parseBackgroundMappings('Driftline Beach - North Cove Path = north-cove.webp');
  assert.equal(resolveBackground('  DRIFTLINE   BEACH â€” North Cove Path ', mappings)?.file, 'north-cove.webp');
});

test('matches a simple room within a changing structured location', () => {
  const mappings = parseBackgroundMappings('Bedroom = bedroom.webp');
  assert.equal(resolveBackground("Sunset Shores Apartments - Will's Back Unit Bedroom", mappings)?.file, 'bedroom.webp');
  assert.equal(normalizeLocation(' Bedroom '), 'bedroom');
});

test('uses all plus-separated terms and prefers the most specific mapping', () => {
  const mappings = parseBackgroundMappings('Pool = generic-pool.webp\nSunset Shores Apartments + Pool = apartment_pool.webp\nSchool + Pool = school_pool.webp');
  assert.equal(resolveBackground('Sunset Shores Apartments - Community Pool', mappings)?.file, 'apartment_pool.webp');
  assert.equal(resolveBackground('Westview School, Indoor Pool', mappings)?.file, 'school_pool.webp');
  assert.equal(resolveBackground('Municipal Pool', mappings)?.file, 'generic-pool.webp');
});

