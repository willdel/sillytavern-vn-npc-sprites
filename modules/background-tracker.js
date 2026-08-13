export function normalizeLocation(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u2012-\u2015]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase();
}

export function parseBackgroundMappings(text = '') {
  const mappings = [];
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const location = line.slice(0, separator).trim();
    const file = line.slice(separator + 1).trim();
    const terms = location.split('+').map(normalizeLocation).filter(Boolean);
    if (location && file && terms.length) mappings.push({ location, normalizedLocation: normalizeLocation(location), terms, file });
  }
  return mappings;
}

export function resolveBackground(location, mappings = []) {
  const normalized = normalizeLocation(location);
  if (!normalized) return null;
  const matches = mappings.filter(mapping => {
    const terms = mapping.terms?.length ? mapping.terms : [mapping.normalizedLocation];
    return terms.every(term => normalized.includes(term));
  });
  return matches.sort((a, b) => {
    const aExact = a.normalizedLocation === normalized ? 1 : 0;
    const bExact = b.normalizedLocation === normalized ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    const aTerms = a.terms?.length ?? 1;
    const bTerms = b.terms?.length ?? 1;
    if (aTerms !== bTerms) return bTerms - aTerms;
    const aLength = (a.terms ?? [a.normalizedLocation]).join('').length;
    const bLength = (b.terms ?? [b.normalizedLocation]).join('').length;
    return bLength - aLength;
  })[0] ?? null;
}

