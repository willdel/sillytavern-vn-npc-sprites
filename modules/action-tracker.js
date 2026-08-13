function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const DEFAULT_ACTION_DEFINITIONS = `walking | temporary | 10 = walk, walks, walked, walking, stroll, strolls, strolled, strolling
sitting | persistent | 20 = sit down, sits down, sat down, seated, takes a seat
standing | persistent | 20 = stand up, stands up, stood up, standing
eating | temporary | 40 = eat, eats, ate, eating, takes a bite, chewing
drinking | temporary | 40 = drink, drinks, drank, drinking, takes a sip, sips
sleeping | persistent | 100 = fall asleep, falls asleep, fell asleep, sleeping, asleep
working | persistent | 30 = starts work, working, gets to work
reading | persistent | 30 = starts reading, reading, reads`;

export function parseActionDefinitions(text = '') {
  const definitions = [];
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const [left, ...rightParts] = line.split('=');
    const [labelPart, modePart = 'temporary', priorityPart = '0'] = left.split('|');
    const label = labelPart?.trim().toLocaleLowerCase();
    const mode = modePart.trim().toLocaleLowerCase();
    const parsedPriority = Number(priorityPart.trim());
    const priority = Number.isFinite(parsedPriority) ? parsedPriority : 0;
    const triggers = rightParts.join('=').split(',').map(item => item.trim()).filter(Boolean);
    if (label && ['temporary', 'persistent'].includes(mode) && triggers.length) definitions.push({ label, mode, priority, triggers });
  }
  return definitions;
}

export function detectActions(text, characters, definitions) {
  const source = String(text ?? '').split(/^.*INTERNAL STATES.*$/imu, 1)[0];
  const segments = source.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const updates = [];
  for (const character of characters) {
    const namePattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(character.name)}(?![\\p{L}\\p{N}_])`, 'u');
    let last = null;
    segments.forEach((segment, segmentIndex) => {
      if (characters.length !== 1 && !namePattern.test(segment)) return;
      for (const definition of definitions) {
        for (const trigger of definition.triggers) {
          const match = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(trigger)}(?![\\p{L}\\p{N}_])`, 'iu').exec(segment);
          if (match) {
            const candidate = { name: character.name, label: definition.label, mode: definition.mode, priority: definition.priority ?? 0, index: segmentIndex * 10000 + match.index };
            if (!last || candidate.priority > last.priority || (candidate.priority === last.priority && candidate.index >= last.index)) last = candidate;
          }
        }
      }
    });
    if (last) updates.push(last);
  }
  return updates.sort((a, b) => a.index - b.index).map(({ index, priority, ...update }) => update);
}

export function updateActionStates(previous = {}, roster = [], updates = []) {
  const allowed = new Set(roster.map(name => name.toLocaleLowerCase()));
  const next = {};
  for (const [name, state] of Object.entries(previous)) {
    if (allowed.has(name.toLocaleLowerCase())) next[name] = { persistent: state?.persistent ?? null, temporary: null };
  }
  for (const name of roster) next[name] ??= { persistent: null, temporary: null };
  for (const update of updates) {
    const key = roster.find(name => name.toLocaleLowerCase() === update.name.toLocaleLowerCase());
    if (!key) continue;
    if (update.mode === 'persistent') {
      next[key].persistent = update.label;
      next[key].temporary = null;
    } else {
      next[key].temporary = update.label;
    }
  }
  return next;
}

export function currentAction(state) {
  return state?.temporary ?? state?.persistent ?? null;
}
