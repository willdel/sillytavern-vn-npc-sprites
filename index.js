import { buildCandidates, detectNpc } from './modules/detection.js';
import { chooseSprite, clearSpriteCache, getSprites } from './modules/sprites.js';
import { clearNpcSprites, removeRenderer, renderNpcSprite } from './modules/renderer.js';

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
  const match = detectNpc(text, candidates, { allowMentionFallback: config.allowMentionFallback });
  if (!match) {
    clearNpcSprites();
    return setStatus('No unambiguous matching character card name found.');
  }

  try {
    const sprites = await getSprites(match.name);
    const sprite = chooseSprite(sprites, config.fallbackLabel);
    if (!sprite?.path) {
      clearNpcSprites();
      return setStatus(`Matched ${match.name}, but its sprite folder is empty.`);
    }
    renderNpcSprite({ name: match.name, path: sprite.path, reason: match.reason });
    setStatus(`Showing ${match.name} (${sprite.label}; ${match.reason}).`);
  } catch (error) {
    console.error(`[${MODULE_NAME}]`, error);
    clearNpcSprites();
    setStatus(`Could not load sprites for ${match.name}.`);
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
