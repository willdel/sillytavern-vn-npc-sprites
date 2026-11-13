const cache = new Map();
const videoCache = new Map();

export async function getSprites(name, { force = false } = {}) {
  if (!force && cache.has(name)) return cache.get(name);
  const response = await fetch(`/api/sprites/get?name=${encodeURIComponent(name)}`);
  if (!response.ok) throw new Error(`Sprite lookup failed (${response.status})`);
  const sprites = await response.json();
  const result = Array.isArray(sprites) ? sprites : [];
  cache.set(name, result);
  return result;
}

export function chooseSprite(sprites, preferredLabel = 'neutral', alternateLabels = []) {
  if (!sprites.length) return null;
  const wanted = [preferredLabel, ...alternateLabels].map(label => String(label ?? '').trim().toLocaleLowerCase()).filter(Boolean);
  return wanted.map(label => sprites.find(sprite => String(sprite.label).toLocaleLowerCase() === label)).find(Boolean)
    ?? sprites.find(sprite => ['neutral', 'default'].includes(String(sprite.label).toLocaleLowerCase()))
    ?? sprites[0];
}

export function chooseOutfitSprite(sprites, { outfit, defaultOutfit = 'casual', action, expression, fallback = 'neutral' } = {}) {
  if (!sprites.length) return null;
  const normalizedOutfit = String(outfit ?? defaultOutfit).trim().toLocaleLowerCase();
  const normalizedDefault = String(defaultOutfit ?? 'casual').trim().toLocaleLowerCase();
  const states = [action, expression, fallback].map(value => String(value ?? '').trim().toLocaleLowerCase()).filter(Boolean);
  const labels = normalizedOutfit && normalizedOutfit !== normalizedDefault
    ? [...states.map(state => `${normalizedOutfit}_${state}`), `${normalizedOutfit}_neutral`, ...states]
    : states;
  return chooseSprite(sprites, labels[0], labels.slice(1));
}

export function clearSpriteCache() {
  cache.clear();
  videoCache.clear();
}

export function matchingSpriteVideoPath(spritePath = '') {
  const [clean, query = ''] = String(spritePath).split('?');
  if (!/\.[a-z0-9]+$/iu.test(clean)) return '';
  const path = clean.replace(/\.[a-z0-9]+$/iu, '.webm');
  return query ? `${path}?${query}` : path;
}

export async function getMatchingSpriteVideoPath(spritePath, { force = false } = {}) {
  const path = matchingSpriteVideoPath(spritePath);
  if (!path) return '';
  if (!force && videoCache.has(path)) return videoCache.get(path);
  const lookup = fetch(path, { method: 'HEAD', cache: 'no-store' })
    .then(response => response.ok && String(response.headers.get('content-type') ?? '').toLocaleLowerCase().startsWith('video/') ? path : '')
    .catch(() => '');
  videoCache.set(path, lookup);
  return lookup;
}

export function getCardAvatarPath(character) {
  const avatar = String(character?.avatar ?? '').trim();
  return avatar && avatar !== 'none' ? `/characters/${encodeURIComponent(avatar)}` : null;
}

