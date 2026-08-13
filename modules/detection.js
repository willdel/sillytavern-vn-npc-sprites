function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function boundaryPattern(name) {
  return `(?<![\\p{L}\\p{N}_])${escapeRegExp(name)}(?![\\p{L}\\p{N}_])`;
}

export function parseAliases(text = '') {
  const aliases = new Map();
  for (const line of text.split(/\r?\n/)) {
    const [alias, ...targetParts] = line.split('=');
    const target = targetParts.join('=').trim();
    if (alias?.trim() && target) aliases.set(alias.trim(), target);
  }
  return aliases;
}

export function buildCandidates(characters = [], aliasText = '') {
  const byName = new Map();
  for (const character of characters) {
    const name = String(character?.name ?? character?.data?.name ?? '').trim();
    if (name && !byName.has(name.toLocaleLowerCase())) byName.set(name.toLocaleLowerCase(), { name, character });
  }

  const candidates = [...byName.values()].map(({ name, character }) => ({ token: name, name, character, alias: false }));
  for (const [alias, target] of parseAliases(aliasText)) {
    const match = byName.get(target.toLocaleLowerCase());
    if (match) candidates.push({ token: alias, name: match.name, character: match.character, alias: true });
  }
  return candidates.sort((a, b) => b.token.length - a.token.length);
}

export function detectNpc(text, candidates, { allowMentionFallback = true } = {}) {
  const result = detectNpcs(text, candidates, { allowMentionFallback });
  if (result.activeSpeaker) return result.activeSpeaker;
  return result.characters.length === 1 ? { ...result.characters[0], reason: 'unique-mention' } : null;
}

export function detectNpcs(text, candidates, { allowMentionFallback = true, limit = 5 } = {}) {
  const fullText = String(text ?? '');
  const source = fullText.split(/^.*INTERNAL STATES.*$/imu, 1)[0];
  const explicitSpeakers = [];
  for (const candidate of candidates) {
    const token = boundaryPattern(candidate.token);
    const speaker = new RegExp(`(?:^|\\n)\\s*(?:[*_>~-]+\\s*)?${token}\\s*(?::|\\u2014|\\u2013|-)`, 'iu');
    const match = speaker.exec(source);
    if (match) explicitSpeakers.push({ ...candidate, reason: 'explicit-speaker', index: match.index });
  }

  const mentions = allowMentionFallback ? candidates.flatMap(candidate => {
    const match = new RegExp(boundaryPattern(candidate.token), 'iu').exec(source);
    return match ? [{ ...candidate, reason: 'mention', index: match.index }] : [];
  }) : [];

  const byCard = new Map();
  for (const match of [...explicitSpeakers, ...mentions].sort((a, b) => a.index - b.index)) {
    const key = match.name.toLocaleLowerCase();
    const existing = byCard.get(key);
    if (!existing || match.reason === 'explicit-speaker') byCard.set(key, match);
  }

  const activeSpeaker = explicitSpeakers.sort((a, b) => b.index - a.index)[0] ?? null;
  let characters = [...byCard.values()];
  if (activeSpeaker && !characters.slice(0, limit).some(item => item.name === activeSpeaker.name)) {
    characters = [activeSpeaker, ...characters.filter(item => item.name !== activeSpeaker.name)];
  }
  characters = characters.slice(0, limit).map(({ index, ...item }) => item);
  return {
    characters,
    activeSpeaker: activeSpeaker ? (({ index, ...item }) => item)(activeSpeaker) : null,
  };
}
