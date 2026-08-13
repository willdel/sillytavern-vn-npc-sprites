const ENTER_VERBS = String.raw`(?:arriv(?:e|es|ed|ing)|enter(?:s|ed|ing)?|approach(?:es|ed|ing)?|appear(?:s|ed|ing)?|come(?:s)?\s+(?:in|inside|over)|walk(?:s|ed|ing)?\s+(?:in|inside|over|toward|towards|up)|step(?:s|ped|ping)?\s+(?:in|inside|into|through|toward|towards|up)|stand(?:s|ing)?|sit(?:s|ting)?|wait(?:s|ed|ing)?|lean(?:s|ed|ing)?|turn(?:s|ed|ing)?|look(?:s|ed|ing)?|say(?:s|ing)?|ask(?:s|ed|ing)?|repl(?:y|ies|ied|ying)|smile(?:s|d|ing)?|wave(?:s|d|ing)?|tap(?:s|ped|ping)?|lift(?:s|ed|ing)?|hold(?:s|ing)?|shift(?:s|ed|ing)?)`;
const EXIT_VERBS = String.raw`(?:leav(?:e|es|ing)|left|exit(?:s|ed|ing)?|depart(?:s|ed|ing)?|walk(?:s|ed|ing)?\s+away|step(?:s|ped|ping)?\s+(?:out|away|back\s+inside)|head(?:s|ed|ing)?\s+(?:away|out|home|inside)|drive(?:s|d|ing)?\s+(?:away|off)|disappear(?:s|ed|ing)?|vanish(?:es|ed|ing)?|close(?:s|d|ing)?\s+(?:the|her|his|their)\s+door)`;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function visibleNarration(text) {
  return String(text ?? '').split(/^.*INTERNAL STATES.*$/imu, 1)[0];
}

export function extractLocation(text) {
  const match = visibleNarration(text).match(/(?:^|\|)\s*(?:ðŸ“\s*)?Location\s*[: ]\s*([^|\]\n]+)/iu);
  return match?.[1]?.trim().replace(/\s+/g, ' ') ?? null;
}

function firstMatchIndex(source, patterns) {
  let index = -1;
  for (const pattern of patterns) {
    const match = pattern.exec(source);
    if (match && (index < 0 || match.index < index)) index = match.index;
  }
  return index;
}

export function analyzeScene(text, candidates) {
  const source = visibleNarration(text);
  const entrances = [];
  const exits = [];
  const speakers = [];

  for (const candidate of candidates) {
    const name = escapeRegExp(candidate.token);
    const boundary = `(?<![\\p{L}\\p{N}_])${name}(?![\\p{L}\\p{N}_])`;
    const speakerIndex = firstMatchIndex(source, [new RegExp(`(?:^|\\n)\\s*(?:[*_>~-]+\\s*)?${boundary}\\s*(?::|\\u2014|\\u2013|-)`, 'iu')]);
    const exitIndex = firstMatchIndex(source, [
      new RegExp(`${boundary}[^.!?\\n]{0,45}\\b${EXIT_VERBS}\\b`, 'iu'),
      new RegExp(`\\b${EXIT_VERBS}\\b[^.!?\\n]{0,45}${boundary}`, 'iu'),
      new RegExp(`(?:say|says|said|wave|waves|waved)\\s+goodbye\\s+to\\s+${boundary}`, 'iu'),
    ]);
    const entranceIndex = firstMatchIndex(source, [
      new RegExp(`${boundary}[^.!?\\n]{0,45}\\b${ENTER_VERBS}\\b`, 'iu'),
      new RegExp(`\\b${ENTER_VERBS}\\b[^.!?\\n]{0,45}${boundary}`, 'iu'),
      new RegExp(`(?:I(?:'m| am)|my name is)\\s+${boundary}`, 'iu'),
      new RegExp(`(?:I(?:'m| am)|my name(?:'s| is)|call(?:ing)? me)[^.!?\\n]{0,70}(?:[.!?]\\s*)?${boundary}`, 'iu'),
    ]);

    if (speakerIndex >= 0) speakers.push({ ...candidate, reason: 'explicit-speaker', index: speakerIndex });
    if (exitIndex >= 0 && exitIndex >= entranceIndex) exits.push({ ...candidate, reason: 'exit', index: exitIndex });
    else if (speakerIndex >= 0 || entranceIndex >= 0) entrances.push({ ...candidate, reason: speakerIndex >= 0 ? 'explicit-speaker' : 'physical-presence', index: Math.max(speakerIndex, entranceIndex) });
  }

  speakers.sort((a, b) => a.index - b.index);
  entrances.sort((a, b) => a.index - b.index);
  exits.sort((a, b) => a.index - b.index);
  return { entrances, exits, activeSpeaker: speakers.at(-1) ?? null, location: extractLocation(source) };
}

export function updateScene(previous, analysis, { limit = 5 } = {}) {
  const locationChanged = Boolean(previous.location && analysis.location && previous.location !== analysis.location);
  const roster = locationChanged ? [] : [...(previous.roster ?? [])];
  const exited = new Set(analysis.exits.map(item => item.name.toLocaleLowerCase()));
  let next = roster.filter(name => !exited.has(name.toLocaleLowerCase()));
  for (const character of analysis.entrances) {
    next = next.filter(name => name.toLocaleLowerCase() !== character.name.toLocaleLowerCase());
    next.push(character.name);
  }
  if (next.length > limit) next = next.slice(-limit);
  return { roster: next, location: analysis.location ?? previous.location ?? null, activeSpeaker: analysis.activeSpeaker?.name ?? null, locationChanged };
}
