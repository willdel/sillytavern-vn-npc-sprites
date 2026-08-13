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
    if (location && file) mappings.push({ location, normalizedLocation: normalizeLocation(location), file });
  }
  return mappings;
}

export function resolveBackground(location, mappings = []) {
  const normalized = normalizeLocation(location);
  if (!normalized) return null;
  return mappings.find(mapping => mapping.normalizedLocation === normalized) ?? null;
}

