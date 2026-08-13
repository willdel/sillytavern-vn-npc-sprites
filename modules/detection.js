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
  const source = String(text ?? '');
  for (const candidate of candidates) {
    const token = boundaryPattern(candidate.token);
    const speaker = new RegExp(`(?:^|\\n)\\s*(?:[*_>~-]+\\s*)?${token}\\s*(?::|—|–|-)`, 'iu');
    if (speaker.test(source)) return { ...candidate, reason: 'explicit-speaker' };
  }

  if (!allowMentionFallback) return null;
  const matches = candidates.filter(candidate => new RegExp(boundaryPattern(candidate.token), 'iu').test(source));
  const uniqueCards = new Map(matches.map(match => [match.name.toLocaleLowerCase(), match]));
  return uniqueCards.size === 1 ? { ...uniqueCards.values().next().value, reason: 'unique-mention' } : null;
}
