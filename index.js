import { buildCandidates, detectNpcs } from './modules/detection.js';
import { chooseSprite, clearSpriteCache, getSprites } from './modules/sprites.js';
import { clearNpcSprites, removeRenderer, renderNpcSprites } from './modules/renderer.js';

const MODULE_NAME = 'vn_npc_sprites';
const EXTENSION_FOLDER = 'third-party/sillytavern-vn-npc-sprites';
const DEFAULTS = Object.freeze({ enabled: true, allowMentionFallback: true, fallbackLabel: 'neutral', aliases: '' });
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
  return context.extensionSettings[MODULE_NAME];
}

function setStatus(message) {
  $('#vn_npc_status').text(message);
}

function isVnMode() {
  return document.body.classList.contains('waifuMode');
}

async function routeText(text) {
  const config = settings();
  if (!config.enabled) return clearNpcSprites();
  if (!isVnMode()) {
    clearNpcSprites();
    return setStatus('Detected message, but Visual Novel mode is off.');
  }

  const library = characterLibrary.length ? characterLibrary : await refreshCharacterLibrary();
  const candidates = buildCandidates(library, config.aliases);
  const detection = detectNpcs(text, candidates, { allowMentionFallback: config.allowMentionFallback, limit: 5 });
  if (!detection.characters.length) {
    clearNpcSprites();
    return setStatus('No matching character card names found.');
  }

  try {
    const resolved = await Promise.all(detection.characters.map(async match => {
      const sprite = chooseSprite(await getSprites(match.name), config.fallbackLabel);
      return sprite?.path ? {
        name: match.name,
        path: sprite.path,
        label: sprite.label,
        reason: match.reason,
        active: detection.activeSpeaker?.name === match.name,
      } : null;
    }));
    const visible = resolved.filter(Boolean);
    renderNpcSprites(visible);
    if (!visible.length) return setStatus('Matched characters, but none have usable sprites.');
    setStatus(`Showing ${visible.map(item => item.name).join(', ')} (${visible.length}/5).`);
  } catch (error) {
    console.error(`[${MODULE_NAME}]`, error);
    clearNpcSprites();
    setStatus('Could not load one or more character sprites.');
  }
}

function latestAiText(messageId) {
  const message = Number.isInteger(messageId) ? context.chat[messageId] : null;
  return message?.mes ?? [...context.chat].reverse().find(item => !item.is_user && !item.is_system)?.mes ?? '';
}

async function onCharacterMessage(messageId) {
  await routeText(latestAiText(messageId));
}

function bindSettings() {
  const config = settings();
  $('#vn_npc_enabled').prop('checked', config.enabled).on('input', function () {
    config.enabled = this.checked;
    if (!config.enabled) clearNpcSprites();
    context.saveSettingsDebounced();
  });
  $('#vn_npc_mentions').prop('checked', config.allowMentionFallback).on('input', function () {
    config.allowMentionFallback = this.checked;
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
  $('#vn_npc_test').on('click', () => routeText(latestAiText()));
  $('#vn_npc_clear').on('click', () => { clearNpcSprites(); setStatus('Sprite cleared.'); });
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
  context.eventSource.on(context.eventTypes.CHAT_CHANGED, clearNpcSprites);
  context.eventSource.on(context.eventTypes.CHARACTER_EDITED, async () => {
    clearSpriteCache();
    await refreshCharacterLibrary();
  });
  await refreshCharacterLibrary();
}

export function onDisable() {
  clearNpcSprites();
}

export function onDelete() {
  removeRenderer();
}

jQuery(initialize);
