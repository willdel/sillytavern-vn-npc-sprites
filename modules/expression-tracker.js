function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function expressionSamples(text, names) {
  const source = String(text ?? '').split(/^.*INTERNAL STATES.*$/imu, 1)[0];
  const segments = source.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const samples = new Map();
  for (const name of names) {
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(name)}(?![\\p{L}\\p{N}_])`, 'u');
    const relevant = segments.filter(segment => pattern.test(segment));
    if (relevant.length) samples.set(name, relevant.slice(-3).join(' '));
  }
  return samples;
}

export function updateExpressionStates(previous = {}, roster = [], updates = []) {
  const next = {};
  for (const name of roster) next[name] = previous[name] ?? null;
  for (const { name, label } of updates) {
    const key = roster.find(item => item.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (key && label) next[key] = label;
  }
  return next;
}
