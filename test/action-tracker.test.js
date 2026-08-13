import test from 'node:test';
import assert from 'node:assert/strict';
import { currentAction, detectActions, parseActionDefinitions, updateActionStates } from '../modules/action-tracker.js';

test('parses custom temporary and persistent actions', () => {
  const definitions = parseActionDefinitions('kissing | temporary = kiss, kisses\nsleeping | persistent = falls asleep, sleeping');
  assert.deepEqual(definitions[0], { label: 'kissing', mode: 'temporary', triggers: ['kiss', 'kisses'] });
  assert.equal(definitions[1].mode, 'persistent');
});

test('attributes actions to named characters', () => {
  const definitions = parseActionDefinitions('walking | temporary = walks\nkissing | temporary = kisses');
  const updates = detectActions('Jade walks toward the door. Bunny kisses Sheri.', [{ name: 'Jade' }, { name: 'Bunny' }], definitions);
  assert.deepEqual(updates, [{ name: 'Jade', label: 'walking', mode: 'temporary' }, { name: 'Bunny', label: 'kissing', mode: 'temporary' }]);
});

test('temporary actions expire on the next update', () => {
  const first = updateActionStates({}, ['Jade'], [{ name: 'Jade', label: 'walking', mode: 'temporary' }]);
  assert.equal(currentAction(first.Jade), 'walking');
  const second = updateActionStates(first, ['Jade'], []);
  assert.equal(currentAction(second.Jade), null);
});

test('persistent actions remain and temporarily yield to temporary actions', () => {
  const sitting = updateActionStates({}, ['Jade'], [{ name: 'Jade', label: 'sitting', mode: 'persistent' }]);
  const drinking = updateActionStates(sitting, ['Jade'], [{ name: 'Jade', label: 'drinking', mode: 'temporary' }]);
  assert.equal(currentAction(drinking.Jade), 'drinking');
  assert.equal(currentAction(updateActionStates(drinking, ['Jade'], []).Jade), 'sitting');
});

test('action state is removed when a character leaves', () => {
  assert.deepEqual(updateActionStates({ Jade: { persistent: 'sitting', temporary: null } }, [], []), {});
});
