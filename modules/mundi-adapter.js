function normalized(value) {
  return String(value ?? '').trim().toLocaleLowerCase();
}

export function resolveMundiCharacterNames({ avatarIds = [], visibleNames = [], characters = [], currentCharacter = null } = {}) {
  const byAvatar = new Map();
  const byName = new Map();
  for (const character of characters) {
    if (!character?.name) continue;
    byName.set(normalized(character.name), character.name);
    if (character.avatar) byAvatar.set(normalized(character.avatar), character.name);
  }

  const result = [];
  const add = name => {
    if (name && !result.some(item => normalized(item) === normalized(name))) result.push(name);
  };
  for (const avatar of avatarIds) add(byAvatar.get(normalized(avatar)));
  for (const name of visibleNames) add(byName.get(normalized(name)));
  if (!result.length && currentCharacter?.name) add(byName.get(normalized(currentCharacter.name)) ?? currentCharacter.name);
  return result;
}
