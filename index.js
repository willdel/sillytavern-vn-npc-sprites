import { buildCandidates } from './modules/detection.js';
import { chooseSprite, clearSpriteCache, getCardAvatarPath, getSprites } from './modules/sprites.js';
import { clearNpcSprites, removeRenderer, renderNpcSprites } from './modules/renderer.js';
import { analyzeScene, updateScene } from './modules/scene-tracker.js';

const MODULE_NAME = 'vn_npc_sprites';
const EXTENSION_FOLDER = 'third-party/sillytavern-vn-npc-sprites';
const DEFAULTS = Object.freeze({ enabled: true, fallbackLabel: 'neutral', aliases: '', scenes: {} });
let context;
let characterLibrary = [];

async function refreshCharacterLibrary() {
  try {
    const response = await fetch('/api/characters/all', {
      method: 'POST',
      headers: context.getRequestHeaders(),
      body: JSON.stringify({}),
    });
    if (!response.ok) throw new Error(`Character lookup failed (${response.status})`);
    const characters = await response.json();
    characterLibrary = Array.isArray(characters) ? characters : [];
  } catch (error) {
    console.warn(`[${MODULE_NAME}] Falling back to the loaded character list.`, error);
    characterLibrary = context.characters;
  }
  return characterLibrary;
}

function settings() {
  context.extensionSettings[MODULE_NAME] ??= structuredClone(DEFAULTS);
  context.extensionSettings[MODULE_NAME].scenes ??= {};
  return context.extensionSettings[MODULE_NAME];
}

function sceneKey() {
  return String(context.chatId ?? `${context.groupId ?? 'character'}:${context.characterId ?? 'none'}`);
}

function getScene() {
  return settings().scenes[sceneKey()] ??= { roster: [], location: null, activeSpeaker: null };
}

function saveScene(scene) {
  settings().scenes[sceneKey()] = scene;
  context.saveSettingsDebounced();
  updateRosterUi(scene);
}

function updateRosterUi(scene = getScene()) {
  const text = scene.roster.length ? scene.roster.join(', ') : 'No tracked characters.';
  $('#vn_npc_roster').text(`${text}${scene.location ? ` â€” ${scene.location}` : ''}`);
}

function populateCharacterPicker() {
  const picker = $('#vn_npc_character').empty();
  for (const character of [...characterLibrary].sort((a, b) => String(a.name).localeCompare(String(b.name)))) {
    if (character?.name) picker.append($('<option>').val(character.name).text(character.name));
  }
}

function setStatus(message) {
  $('#vn_npc_status').text(message);
}

function isVnMode() {
  return document.body.classList.contains('waifuMode');
}

async function renderScene(scene, candidates) {
  const config = settings();
  if (!config.enabled) return clearNpcSprites();
  if (!isVnMode()) {
    clearNpcSprites();
    return setStatus('Detected message, but Visual Novel mode is off.');
  }

  const byName = new Map(candidates.map(candidate => [candidate.name.toLocaleLowerCase(), candidate]));
  const tracked = scene.roster.map(name => byName.get(name.toLocaleLowerCase())).filter(Boolean);
  if (!tracked.length) {
    clearNpcSprites();
    return setStatus('Scene roster is empty. No ordinary mentions were added.');
  }

  try {
    const resolved = await Promise.all(tracked.map(async match => {
      const sprite = chooseSprite(await getSprites(match.name), config.fallbackLabel);
      const avatarPath = getCardAvatarPath(match.character);
      const path = sprite?.path ?? avatarPath;
      return path ? {
        name: match.name,
        path,
        label: sprite?.label ?? 'card avatar',
        reason: match.reason,
        active: scene.activeSpeaker === match.name,
        cardAvatar: !sprite,
      } : null;
    }));
    const visible = resolved.filter(Boolean);
    renderNpcSprites(visible);
    if (!visible.length) return setStatus('Matched characters, but none have usable sprites.');
    const fallbacks = visible.filter(item => item.cardAvatar).map(item => item.name);
    const fallbackNote = fallbacks.length ? ` Card avatar fallback: ${fallbacks.join(', ')}.` : '';
    setStatus(`Showing ${visible.map(item => item.name).join(', ')} (${visible.length}/5).${fallbackNote}`);
  } catch (error) {
    console.error(`[${MODULE_NAME}]`, error);
    clearNpcSprites();
    setStatus('Could not load one or more character sprites.');
  }
}

async function routeText(text) {
  const config = settings();
  const library = characterLibrary.length ? characterLibrary : await refreshCharacterLibrary();
  const candidates = buildCandidates(library, config.aliases);
  const analysis = analyzeScene(text, candidates);
  const scene = updateScene(getScene(), analysis, { limit: 5 });
  saveScene(scene);
  await renderScene(scene, candidates);
  const changes = [
    analysis.entrances.length ? `added ${analysis.entrances.map(item => item.name).join(', ')}` : '',
    analysis.exits.length ? `removed ${analysis.exits.map(item => item.name).join(', ')}` : '',
    scene.locationChanged ? 'cleared for location change' : '',
  ].filter(Boolean).join('; ');
  if (changes) $('#vn_npc_status').append(` Scene update: ${changes}.`);
}

function latestAiText(messageId) {
  const message = Number.isInteger(messageId) ? context.chat[messageId] : null;
  return message?.mes ?? [...context.chat].reverse().find(item => !item.is_user && !item.is_system)?.mes ?? '';
}

function latestSceneText(messageId) {
  const aiIndex = Number.isInteger(messageId) ? messageId : context.chat.findLastIndex(item => !item.is_user && !item.is_system);
  const aiText = aiIndex >= 0 ? context.chat[aiIndex]?.mes ?? '' : latestAiText();
  const userText = aiIndex > 0 ? [...context.chat.slice(0, aiIndex)].reverse().find(item => item.is_user && !item.is_system)?.mes ?? '' : '';
  return `${userText}\n${aiText}`;
}

async function onCharacterMessage(messageId) {
  await routeText(latestSceneText(messageId));
}

function bindSettings() {
  const config = settings();
  $('#vn_npc_enabled').prop('checked', config.enabled).on('input', function () {
    config.enabled = this.checked;
    if (!config.enabled) clearNpcSprites();
    context.saveSettingsDebounced();
  });
  $('#vn_npc_fallback').val(config.fallbackLabel).on('input', function () {
    config.fallbackLabel = this.value || 'neutral';
    context.saveSettingsDebounced();
  });
  $('#vn_npc_aliases').val(config.aliases).on('input', function () {
    config.aliases = this.value;
    context.saveSettingsDebounced();
  });
  $('#vn_npc_test').on('click', () => routeText(latestSceneText()));
  $('#vn_npc_add').on('click', async () => {
    const name = String($('#vn_npc_character').val() ?? '');
    if (!name) return;
    const scene = getScene();
    scene.roster = [...scene.roster.filter(item => item !== name), name].slice(-5);
    scene.activeSpeaker = name;
    saveScene(scene);
    await renderScene(scene, buildCandidates(characterLibrary, config.aliases));
  });
  $('#vn_npc_remove').on('click', async () => {
    const name = String($('#vn_npc_character').val() ?? '');
    const scene = getScene();
    scene.roster = scene.roster.filter(item => item !== name);
    if (scene.activeSpeaker === name) scene.activeSpeaker = null;
    saveScene(scene);
    await renderScene(scene, buildCandidates(characterLibrary, config.aliases));
  });
  $('#vn_npc_clear').on('click', () => {
    saveScene({ roster: [], location: null, activeSpeaker: null });
    clearNpcSprites();
    setStatus('Scene cleared.');
  });
  updateRosterUi();
}

async function initialize() {
  context = SillyTavern.getContext();
  settings();
  const html = await context.renderExtensionTemplateAsync(EXTENSION_FOLDER, 'settings');
  $('#extensions_settings2').append(html);
  bindSettings();
  context.eventSource.on(context.eventTypes.CHARACTER_MESSAGE_RENDERED, onCharacterMessage);
  context.eventSource.on(context.eventTypes.MESSAGE_SWIPED, onCharacterMessage);
  context.eventSource.on(context.eventTypes.MESSAGE_EDITED, onCharacterMessage);
  context.eventSource.on(context.eventTypes.CHAT_CHANGED, async () => {
    clearNpcSprites();
    updateRosterUi();
    await renderScene(getScene(), buildCandidates(characterLibrary, settings().aliases));
  });
  context.eventSource.on(context.eventTypes.CHARACTER_EDITED, async () => {
    clearSpriteCache();
    await refreshCharacterLibrary();
    populateCharacterPicker();
  });
  await refreshCharacterLibrary();
  populateCharacterPicker();
  updateRosterUi();
}

export function onDisable() {
  clearNpcSprites();
}

export function onDelete() {
  removeRenderer();
}

jQuery(initialize);
