const cache = new Map();

export async function getSprites(name, { force = false } = {}) {
  if (!force && cache.has(name)) return cache.get(name);
  const response = await fetch(`/api/sprites/get?name=${encodeURIComponent(name)}`);
  if (!response.ok) throw new Error(`Sprite lookup failed (${response.status})`);
  const sprites = await response.json();
  const result = Array.isArray(sprites) ? sprites : [];
  cache.set(name, result);
  return result;
}

export function chooseSprite(sprites, preferredLabel = 'neutral') {
  if (!sprites.length) return null;
  const wanted = preferredLabel.trim().toLocaleLowerCase();
  return sprites.find(sprite => String(sprite.label).toLocaleLowerCase() === wanted)
    ?? sprites.find(sprite => ['neutral', 'default'].includes(String(sprite.label).toLocaleLowerCase()))
    ?? sprites[0];
}

export function clearSpriteCache() {
  cache.clear();
}
