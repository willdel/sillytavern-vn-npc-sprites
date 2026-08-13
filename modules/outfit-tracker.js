function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const DEFAULT_OUTFIT_DEFINITIONS = `casual | 10 = casual clothes, casual clothing, everyday clothes, everyday clothing, regular clothes, normal clothes, street clothes, t-shirt, tee shirt, tank top, blouse, jeans, shorts, sundress
uniform | 40 = uniform, work uniform, school uniform, work clothes, work clothing, office uniform, apron, scrubs, coveralls
swimwear | 60 = swimwear, swimsuit, bathing suit, bikini, one-piece swimsuit, swimming trunks, swim trunks, board shorts
sleepwear | 70 = sleepwear, pajamas, pyjamas, nightwear, nightgown, nightdress, robe, underwear, bra and panties, lingerie, boxers, briefs
nude | 100 = nude, naked, unclothed, completely undressed, no clothes, wearing nothing, strips naked`;

export function parseOutfitDefinitions(text = '') {
  const definitions = [];
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const [left, ...rightParts] = line.split('=');
    const [labelPart, priorityPart = '0'] = left.split('|');
    const label = labelPart?.trim().toLocaleLowerCase();
    const parsedPriority = Number(priorityPart.trim());
    const priority = Number.isFinite(parsedPriority) ? parsedPriority : 0;
    const triggers = rightParts.join('=').split(',').map(item => item.trim()).filter(Boolean);
    if (label && triggers.length) definitions.push({ label, priority, triggers });
  }
  return definitions;
}

export function detectOutfits(text, characters, definitions) {
  const source = String(text ?? '').split(/^.*INTERNAL STATES.*$/imu, 1)[0];
  const segments = source.split(/(?<=[.!?])\s+|\n+/).filter(Boolean);
  const updates = [];
  for (const character of characters) {
    const namePattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(character.name)}(?![\\p{L}\\p{N}_])`, 'u');
    let best = null;
    segments.forEach((segment, segmentIndex) => {
      if (characters.length !== 1 && !namePattern.test(segment)) return;
      for (const definition of definitions) {
        for (const trigger of definition.triggers) {
          const match = new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(trigger)}(?![\\p{L}\\p{N}_])`, 'iu').exec(segment);
          if (!match) continue;
          const candidate = { name: character.name, label: definition.label, priority: definition.priority, index: segmentIndex * 10000 + match.index };
          if (!best || candidate.priority > best.priority || (candidate.priority === best.priority && candidate.index >= best.index)) best = candidate;
        }
      }
    });
    if (best) updates.push(best);
  }
  return updates.map(({ priority, index, ...update }) => update);
}

export function updateOutfitStates(previous = {}, roster = [], updates = [], defaultOutfit = 'casual') {
  const next = {};
  for (const name of roster) next[name] = previous[name] ?? defaultOutfit;
  for (const update of updates) {
    const key = roster.find(name => name.toLocaleLowerCase() === update.name.toLocaleLowerCase());
    if (key) next[key] = update.label;
  }
  return next;
}

