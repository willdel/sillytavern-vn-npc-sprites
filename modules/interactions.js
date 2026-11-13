export const DEFAULT_INTERACTION_DEFINITIONS = `Hug | hug | I hug {character}.
Kiss | kiss | I kiss {character}.
Dance | dance | I invite {character} to dance with me.`;

export function parseInteractionDefinitions(text = '') {
  const definitions = [];
  for (const rawLine of String(text).split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const first = line.indexOf('|');
    const second = first < 0 ? -1 : line.indexOf('|', first + 1);
    if (first < 1 || second < 0) continue;
    const label = line.slice(0, first).trim();
    const image = line.slice(first + 1, second).trim();
    const template = line.slice(second + 1).trim();
    if (!label || !image || !template || !template.includes('{character}')) continue;
    definitions.push({ label, image, template });
  }
  return definitions;
}

export function formatInteractionMessage(template, character) {
  return String(template).replaceAll('{character}', String(character));
}
