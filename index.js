import { buildCandidates } from './modules/detection.js';
import { chooseOutfitSprite, clearSpriteCache, getCardAvatarPath, getSprites } from './modules/sprites.js';
import { clearNpcSprites, removeRenderer, renderNpcSprites } from './modules/renderer.js';
import { analyzeScene, updateScene } from './modules/scene-tracker.js';
import { currentAction, DEFAULT_ACTION_DEFINITIONS, detectActions, parseActionDefinitions, updateActionStates } from './modules/action-tracker.js';
import { expressionSamples, updateExpressionStates } from './modules/expression-tracker.js';
import { parseBackgroundMappings, resolveBackground } from './modules/background-tracker.js';
import { DEFAULT_OUTFIT_DEFINITIONS, detectOutfits, parseOutfitDefinitions, updateOutfitStates } from './modules/outfit-tracker.js';

const MODULE_NAME = 'vn_npc_sprites';
const EXTENSION_FOLDER = 'third-party/sillytavern-vn-npc-sprites';
const DEFAULTS = Object.freeze({ enabled: true, fallbackLabel: 'neutral', aliases: '', expressionsEnabled: true, actionsEnabled: true, actionDefinitions: DEFAULT_ACTION_DEFINITIONS, outfitsEnabled: true, defaultOutfit: 'casual', outfitDefinitions: DEFAULT_OUTFIT_DEFINITIONS, backgroundsEnabled: true, backgroundMappings: '', scenes: {} });
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
  const config = context.extensionSettings[MODULE_NAME];
  config.enabled ??= DEFAULTS.enabled;
  config.fallbackLabel ??= DEFAULTS.fallbackLabel;
  config.aliases ??= DEFAULTS.aliases;
  config.expressionsEnabled ??= DEFAULTS.expressionsEnabled;
  config.actionsEnabled ??= DEFAULTS.actionsEnabled;
  config.actionDefinitions ??= DEFAULTS.actionDefinitions;
  config.outfitsEnabled ??= DEFAULTS.outfitsEnabled;
  config.defaultOutfit ??= DEFAULTS.defaultOutfit;
  config.outfitDefinitions ??= DEFAULTS.outfitDefinitions;
  config.backgroundsEnabled ??= DEFAULTS.backgroundsEnabled;
  config.backgroundMappings ??= DEFAULTS.backgroundMappings;
  config.scenes ??= {};
  return config;
}

function sceneKey() {
  return String(context.chatId ?? `${context.groupId ?? 'character'}:${context.characterId ?? 'none'}`);
}

function getScene() {
  const scene = settings().scenes[sceneKey()] ??= { roster: [], location: null, activeSpeaker: null, actionStates: {}, expressionStates: {}, outfitStates: {} };
  scene.actionStates ??= {};
  scene.expressionStates ??= {};
  scene.outfitStates ??= {};
  return scene;
}

function saveScene(scene) {
  settings().scenes[sceneKey()] = scene;
  context.saveSettingsDebounced();
  updateRosterUi(scene);
}

function updateRosterUi(scene = getScene()) {
  const text = scene.roster.length ? scene.roster.map(name => {
    const action = currentAction(scene.actionStates?.[name]);
    const expression = scene.expressionStates?.[name];
    const outfit = scene.outfitStates?.[name] ?? settings().defaultOutfit;
    const state = [outfit, action ?? expression].filter(Boolean).join(', ');
    return state ? `${name} [${state}]` : name;
  }).join(', ') : 'No tracked characters.';
  $('#vn_npc_roster').text(`${text}${scene.location ? ` - ${scene.location}` : ''}`);
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

async function updateBackground(location, scene) {
  const config = settings();
  if (!config.backgroundsEnabled || !location) return { status: 'disabled-or-missing' };
  const mapping = resolveBackground(location, parseBackgroundMappings(config.backgroundMappings));
  if (!mapping) return { status: 'unmatched', location };
  if (scene.backgroundFile === mapping.file) return { status: 'unchanged', location, file: mapping.file };
  try {
    const result = await context.executeSlashCommandsWithOptions(`/bg ${JSON.stringify(mapping.file)}`, {
      handleParserErrors: false,
      handleExecutionErrors: false,
    });
    if (result?.isError) throw new Error(result.errorMessage || 'The /bg command failed.');
    scene.backgroundFile = mapping.file;
    scene.backgroundLocation = location;
    return { status: 'changed', location, file: mapping.file };
  } catch (error) {
    console.error(`[${MODULE_NAME}] Could not change background.`, error);
    return { status: 'error', location, file: mapping.file };
  }
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
      const action = config.actionsEnabled ? currentAction(scene.actionStates?.[match.name]) : null;
      const expression = config.expressionsEnabled ? scene.expressionStates?.[match.name] : null;
      const preferred = action ?? expression ?? config.fallbackLabel;
      const outfit = config.outfitsEnabled ? scene.outfitStates?.[match.name] ?? config.defaultOutfit : config.defaultOutfit;
      const sprite = chooseOutfitSprite(await getSprites(match.name), { outfit, defaultOutfit: config.defaultOutfit, action, expression, fallback: config.fallbackLabel });
      const avatarPath = getCardAvatarPath(match.character);
      const path = sprite?.path ?? avatarPath;
      return path ? {
        name: match.name,
        path,
        label: sprite?.label ?? 'card avatar',
        action,
        expression,
        outfit,
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
    const actions = visible.filter(item => item.action).map(item => `${item.name}: ${item.action}`);
    const actionNote = actions.length ? ` Actions: ${actions.join(', ')}.` : '';
    const expressions = visible.filter(item => !item.action && item.expression).map(item => `${item.name}: ${item.expression}`);
    const expressionNote = expressions.length ? ` Expressions: ${expressions.join(', ')}.` : '';
    setStatus(`Showing ${visible.map(item => item.name).join(', ')} (${visible.length}/5).${actionNote}${expressionNote}${fallbackNote}`);
  } catch (error) {
    console.error(`[${MODULE_NAME}]`, error);
    clearNpcSprites();
    setStatus('Could not load one or more character sprites.');
  }
}

async function routeText(sceneText, responseText = sceneText) {
  const config = settings();
  const library = characterLibrary.length ? characterLibrary : await refreshCharacterLibrary();
  const candidates = buildCandidates(library, config.aliases);
  const analysis = analyzeScene(sceneText, candidates);
  const previous = getScene();
  const scene = updateScene(previous, analysis, { limit: 5 });
  scene.backgroundFile = previous.backgroundFile ?? null;
  scene.backgroundLocation = previous.backgroundLocation ?? null;
  const definitions = parseActionDefinitions(config.actionDefinitions);
  const actionUpdates = config.actionsEnabled ? detectActions(responseText, scene.roster.map(name => ({ name })), definitions) : [];
  scene.actionStates = updateActionStates(scene.locationChanged ? {} : previous.actionStates, scene.roster, actionUpdates);
  const expressionUpdates = await classifyExpressions(responseText, scene.roster, config);
  scene.expressionStates = updateExpressionStates(scene.locationChanged ? {} : previous.expressionStates, scene.roster, expressionUpdates);
  const outfitDefinitions = parseOutfitDefinitions(config.outfitDefinitions);
  const outfitUpdates = config.outfitsEnabled ? detectOutfits(responseText, scene.roster.map(name => ({ name })), outfitDefinitions) : [];
  scene.outfitStates = updateOutfitStates(scene.locationChanged ? {} : previous.outfitStates, scene.roster, outfitUpdates, config.defaultOutfit);
  const backgroundUpdate = await updateBackground(analysis.location, scene);
  saveScene(scene);
  await renderScene(scene, candidates);
  const changes = [
    analysis.entrances.length ? `added ${analysis.entrances.map(item => item.name).join(', ')}` : '',
    analysis.exits.length ? `removed ${analysis.exits.map(item => item.name).join(', ')}` : '',
    scene.locationChanged ? 'cleared for location change' : '',
    actionUpdates.length ? `actions ${actionUpdates.map(item => `${item.name}=${item.label}`).join(', ')}` : '',
    expressionUpdates.length ? `expressions ${expressionUpdates.map(item => `${item.name}=${item.label}`).join(', ')}` : '',
    outfitUpdates.length ? `outfits ${outfitUpdates.map(item => `${item.name}=${item.label}`).join(', ')}` : '',
  ].filter(Boolean).join('; ');
  if (changes) $('#vn_npc_status').append(` Scene update: ${changes}.`);
  if (config.expressionsEnabled && !expressionUpdates.length) $('#vn_npc_status').append(' Expression classifier returned no label; using sprite fallback.');
  if (backgroundUpdate.status === 'changed') $('#vn_npc_status').append(` Background: ${backgroundUpdate.file}.`);
  if (backgroundUpdate.status === 'unmatched') $('#vn_npc_status').append(` No background mapping for: ${backgroundUpdate.location}.`);
  if (backgroundUpdate.status === 'error') $('#vn_npc_status').append(` Could not select background: ${backgroundUpdate.file}.`);
}

async function classifyExpressions(text, roster, config) {
  if (!config.expressionsEnabled || !roster.length) return [];
  try {
    const { getExpressionLabel } = await import('../../expressions/index.js');
    const samples = roster.length === 1
      ? new Map([[roster[0], String(text).split(/^.*INTERNAL STATES.*$/imu, 1)[0]]])
      : expressionSamples(text, roster);
    return (await Promise.all([...samples].map(async ([name, sample]) => ({ name, label: await getExpressionLabel(sample, undefined, { filterAvailable: false }) })))).filter(item => item.label);
  } catch (error) {
    console.warn(`[${MODULE_NAME}] Character Expressions classification unavailable.`, error);
    return [];
  }
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
  await routeText(latestSceneText(messageId), latestAiText(messageId));
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
  $('#vn_npc_expressions_enabled').prop('checked', config.expressionsEnabled).on('input', function () {
    config.expressionsEnabled = this.checked;
    context.saveSettingsDebounced();
  });
  $('#vn_npc_aliases').val(config.aliases).on('input', function () {
    config.aliases = this.value;
    context.saveSettingsDebounced();
  });
  $('#vn_npc_actions_enabled').prop('checked', config.actionsEnabled).on('input', function () {
    config.actionsEnabled = this.checked;
    context.saveSettingsDebounced();
  });
  $('#vn_npc_action_definitions').val(config.actionDefinitions).on('input', function () {
    config.actionDefinitions = this.value;
    context.saveSettingsDebounced();
  });
  $('#vn_npc_outfits_enabled').prop('checked', config.outfitsEnabled).on('input', function () {
    config.outfitsEnabled = this.checked;
    context.saveSettingsDebounced();
  });
  $('#vn_npc_default_outfit').val(config.defaultOutfit).on('input', function () {
    config.defaultOutfit = String(this.value || 'casual').trim().toLocaleLowerCase();
    populateOutfitPicker();
    context.saveSettingsDebounced();
  });
  $('#vn_npc_outfit_definitions').val(config.outfitDefinitions).on('input', function () {
    config.outfitDefinitions = this.value;
    populateOutfitPicker();
    context.saveSettingsDebounced();
  });
  $('#vn_npc_backgrounds_enabled').prop('checked', config.backgroundsEnabled).on('input', function () {
    config.backgroundsEnabled = this.checked;
    context.saveSettingsDebounced();
  });
  $('#vn_npc_background_mappings').val(config.backgroundMappings).on('input', function () {
    config.backgroundMappings = this.value;
    context.saveSettingsDebounced();
  });
  $('#vn_npc_test').on('click', () => routeText(latestSceneText(), latestAiText()));
  $('#vn_npc_add').on('click', async () => {
    const name = String($('#vn_npc_character').val() ?? '');
    if (!name) return;
    const scene = getScene();
    scene.roster = [...scene.roster.filter(item => item !== name), name].slice(-5);
    scene.activeSpeaker = name;
    scene.actionStates ??= {};
    scene.actionStates[name] ??= { persistent: null, temporary: null };
    scene.expressionStates ??= {};
    scene.expressionStates[name] ??= null;
    scene.outfitStates ??= {};
    scene.outfitStates[name] ??= config.defaultOutfit;
    saveScene(scene);
    await renderScene(scene, buildCandidates(characterLibrary, config.aliases));
  });
  $('#vn_npc_remove').on('click', async () => {
    const name = String($('#vn_npc_character').val() ?? '');
    const scene = getScene();
    scene.roster = scene.roster.filter(item => item !== name);
    delete scene.actionStates?.[name];
    delete scene.expressionStates?.[name];
    delete scene.outfitStates?.[name];
    if (scene.activeSpeaker === name) scene.activeSpeaker = null;
    saveScene(scene);
    await renderScene(scene, buildCandidates(characterLibrary, config.aliases));
  });
  $('#vn_npc_reset_action').on('click', async () => {
    const name = String($('#vn_npc_character').val() ?? '');
    const scene = getScene();
    scene.actionStates ??= {};
    scene.actionStates[name] = { persistent: null, temporary: null };
    saveScene(scene);
    await renderScene(scene, buildCandidates(characterLibrary, config.aliases));
  });
  $('#vn_npc_set_outfit').on('click', async () => {
    const name = String($('#vn_npc_character').val() ?? '');
    const outfit = String($('#vn_npc_outfit').val() ?? config.defaultOutfit);
    if (!name) return;
    const scene = getScene();
    scene.outfitStates[name] = outfit;
    saveScene(scene);
    await renderScene(scene, buildCandidates(characterLibrary, config.aliases));
  });
  $('#vn_npc_reset_outfit').on('click', async () => {
    const name = String($('#vn_npc_character').val() ?? '');
    if (!name) return;
    const scene = getScene();
    scene.outfitStates[name] = config.defaultOutfit;
    saveScene(scene);
    await renderScene(scene, buildCandidates(characterLibrary, config.aliases));
  });
  $('#vn_npc_clear').on('click', () => {
    saveScene({ roster: [], location: null, activeSpeaker: null, actionStates: {}, expressionStates: {}, outfitStates: {} });
    clearNpcSprites();
    setStatus('Scene cleared.');
  });
  updateRosterUi();
}

function populateOutfitPicker() {
  const config = settings();
  const labels = [...new Set([config.defaultOutfit, ...parseOutfitDefinitions(config.outfitDefinitions).map(item => item.label)])];
  const picker = $('#vn_npc_outfit').empty();
  for (const label of labels) picker.append($('<option>').val(label).text(label));
}

async function initialize() {
  context = SillyTavern.getContext();
  settings();
  const html = await context.renderExtensionTemplateAsync(EXTENSION_FOLDER, 'settings');
  $('#extensions_settings2').append(html);
  bindSettings();
  populateOutfitPicker();
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

