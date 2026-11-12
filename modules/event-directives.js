export function parseEventDirectives(text = '') {
  const directives = [];
  const pattern = /<vn-event\b([^>]*)>/giu;
  for (const match of String(text).matchAll(pattern)) {
    const attributes = {};
    for (const attribute of match[1].matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gu)) {
      attributes[attribute[1].toLocaleLowerCase()] = attribute[3].trim();
    }
    directives.push({
      character: attributes.character ?? '',
      image: attributes.image ?? '',
      raw: match[0],
      index: match.index ?? 0,
    });
  }
  return directives;
}

export function stripEventDirectives(text = '') {
  return String(text).replace(/<vn-event\b[^>]*>/giu, '').replace(/\n{3,}/g, '\n\n').trimEnd();
}

export function eventSpriteLabel(image = '') {
  const label = String(image).trim().toLocaleLowerCase();
  return label.startsWith('event_') ? label : `event_${label}`;
}

export function isEventVideoRequest(image = '') {
  return /\.mp4$/iu.test(String(image).trim());
}

export function eventVideoFilename(image = '') {
  const basename = String(image).trim().replaceAll('\\', '/').split('/').at(-1) ?? '';
  if (!/^[\p{L}\p{N}_. -]+\.mp4$/iu.test(basename)) return '';
  return eventSpriteLabel(basename);
}

export function eventVideoPath(characterName, image) {
  const filename = eventVideoFilename(image);
  const character = String(characterName ?? '').trim();
  if (!character || !filename) return '';
  return `/characters/${encodeURIComponent(character)}/${encodeURIComponent(filename)}`;
}

export function matchingVideoPath(spritePath = '') {
  const clean = String(spritePath).split('?')[0];
  return /\.[a-z0-9]+$/iu.test(clean) ? clean.replace(/\.[a-z0-9]+$/iu, '.mp4') : '';
}

export function listEventSprites(sprites = []) {
  return sprites.filter(sprite => String(sprite?.label ?? '').toLocaleLowerCase().startsWith('event_'));
}

export function resolveEventSprite(sprites = [], image = '') {
  const wanted = eventSpriteLabel(image);
  return sprites.find(sprite => String(sprite?.label ?? '').toLocaleLowerCase() === wanted) ?? null;
}

