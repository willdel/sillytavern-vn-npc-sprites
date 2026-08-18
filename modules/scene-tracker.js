const ENTER_VERBS = String.raw`(?:arriv(?:e|es|ed|ing)|enter(?:s|ed|ing)?|approach(?:es|ed|ing)?|appear(?:s|ed|ing)?|come(?:s)?\s+(?:in|inside|over)|walk(?:s|ed|ing)?|step(?:s|ped|ping)?|stand(?:s|ing)?|sit(?:s|ting)?|lie(?:s|d|ing)?|reclin(?:e|es|ed|ing)|follow(?:s|ed|ing)?|pad(?:s|ded|ding)?|reach(?:es|ed|ing)?|ris(?:e|es|en|ing)|rose|wait(?:s|ed|ing)?|lean(?:s|ed|ing)?|turn(?:s|ed|ing)?|look(?:s|ed|ing)?|say(?:s|ing)?|ask(?:s|ed|ing)?|repl(?:y|ies|ied|ying)|smile(?:s|d|ing)?|wave(?:s|d|ing)?|tap(?:s|ped|ping)?|lift(?:s|ed|ing)?|hold(?:s|ing)?|shift(?:s|ed|ing)?|stop(?:s|ped|ping)?|pivot(?:s|ed|ing)?|fold(?:s|ed|ing)?|glance(?:s|d|ing)?|point(?:s|ed|ing)?|watch(?:es|ed|ing)?|roll(?:s|ed|ing)?|ease(?:s|d|ing)?|gesture(?:s|d|ing)?|nod(?:s|ded|ding)?|shrug(?:s|ged|ging)?|tilt(?:s|ed|ing)?|rip(?:s|ped|ping)?|push(?:es|ed|ing)?)`;
const EXIT_VERBS = String.raw`(?:(?:turn(?:s|ed|ing)?\s+(?:and\s+)?)?leav(?:e|es|ing)|left|exit(?:s|ed|ing)?|depart(?:s|ed|ing)?|walk(?:s|ed|ing)?\s+away|step(?:s|ped|ping)?\s+(?:out|away|back\s+inside)|head(?:s|ed|ing)?\s+(?:away|out|home|inside)|drive(?:s|d|ing)?\s+(?:away|off)|disappear(?:s|ed|ing)?|vanish(?:es|ed|ing)?|close(?:s|d|ing)?\s+(?:the|her|his|their)\s+door)`;
const EXIT_MODIFIERS = String.raw`(?:(?:quietly|slowly|quickly|finally|then|abruptly|reluctantly|silently|wordlessly)\s+){0,3}`;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function visibleNarration(text) {
  return String(text ?? '').split(/^.*INTERNAL STATES.*$/imu, 1)[0];
}

export function extractLocation(text) {
  const source = visibleNarration(text);
  const match = source.match(/\u{1F4CD}\uFE0F?\s*(?:Location\b\s*[: ]\s*)?([^|\]\n]+)/iu)
    ?? source.match(/\bLocation\s*[: ]\s*([^|\]\n]+)/iu);
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
    const speakerIndex = firstMatchIndex(source, [
      new RegExp(`(?:^|\\n)\\s*(?:[*_>~-]+\\s*)?${boundary}\\s*(?::|\\u2014|\\u2013|-)`, 'iu'),
      new RegExp(`(?:^|\\n)\\s*(?:[*_>~-]+\\s*)?${boundary}[^\\n]{0,1200}?[\"\\u201c]`, 'iu'),
    ]);
    const exitIndex = firstMatchIndex(source, [
      new RegExp(`${boundary}(?:['\\u2019]s)?\\s*[,\\u2014\\u2013-]?\\s*${EXIT_MODIFIERS}\\b${EXIT_VERBS}\\b`, 'iu'),
      new RegExp(`(?:say|says|said|wave|waves|waved)\\s+goodbye\\s+to\\s+${boundary}`, 'u'),
    ]);
    const entranceIndex = firstMatchIndex(source, [
      new RegExp(`${boundary}[^.!?\\n]{0,45}\\b${ENTER_VERBS}\\b`, 'u'),
      new RegExp(`\\b${ENTER_VERBS}\\b[^.!?\\n]{0,45}${boundary}`, 'u'),
      new RegExp(`(?:I(?:'m| am)|my name is)\\s+${boundary}`, 'u'),
      new RegExp(`(?:I(?:'m| am)|my name(?:'s| is)|call(?:ing)? me)[^.!?\\n]{0,70}(?:[.!?]\\s*)?${boundary}`, 'u'),
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

