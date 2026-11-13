const popups = new Map();
let globalListenersBound = false;

function normalizeSlot(slot) {
  return String(slot).toLocaleLowerCase() === 'left' ? 'left' : 'right';
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function fittedSize(size) {
  return Math.max(180, Math.min(Number(size) || 650, window.innerWidth - 24, window.innerHeight - 48));
}

function place(state, position, size) {
  const fallback = { x: state.slot === 'left' ? 24 : window.innerWidth - size - 24, y: 48 };
  const requested = position && Number.isFinite(position.x) && Number.isFinite(position.y) ? position : fallback;
  const next = {
    x: clamp(requested.x, 0, window.innerWidth - size),
    y: clamp(requested.y, 32, window.innerHeight - size),
  };
  state.popup.style.left = `${next.x}px`;
  state.popup.style.top = `${next.y}px`;
  return next;
}

function clearMedia(state) {
  state.image.removeAttribute('src');
  state.video.pause();
  state.video.removeAttribute('src');
  state.video.load();
}

function bindGlobalListeners() {
  if (globalListenersBound) return;
  globalListenersBound = true;
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeEventPopup();
  });
  window.addEventListener('resize', () => {
    for (const state of popups.values()) {
      if (!state.popup.hidden) place(state, { x: state.popup.offsetLeft, y: state.popup.offsetTop }, fittedSize(state.configuredSize));
    }
  });
}

function ensurePopup(slotValue) {
  const slot = normalizeSlot(slotValue);
  if (popups.has(slot)) return popups.get(slot);
  const popup = document.createElement('div');
  popup.id = `vn-event-popup-${slot}`;
  popup.className = `vn-event-popup is-${slot}`;
  popup.hidden = true;
  popup.innerHTML = `
    <div class="vn-event-handle" title="Drag event media. Double-click to reset position.">
      <span class="vn-event-grip">&#10247;</span>
      <span class="vn-event-title"></span>
      <button class="vn-event-reset" type="button" title="Reset position" aria-label="Reset event media position">&#8634;</button>
      <button class="vn-event-close" type="button" title="Close" aria-label="Close event media">&times;</button>
    </div>
    <img class="vn-event-media vn-event-image" alt="VN event image">
    <video class="vn-event-media vn-event-video" muted loop playsinline preload="auto" hidden></video>
  `;
  document.body.append(popup);
  const state = {
    slot,
    popup,
    title: popup.querySelector('.vn-event-title'),
    image: popup.querySelector('.vn-event-image'),
    video: popup.querySelector('.vn-event-video'),
    moveCallback: null,
    configuredSize: 650,
  };
  popups.set(slot, state);
  const handle = popup.querySelector('.vn-event-handle');
  handle.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    const rect = popup.getBoundingClientRect();
    const offset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    handle.setPointerCapture(event.pointerId);
    const move = current => place(state, { x: current.clientX - offset.x, y: current.clientY - offset.y }, fittedSize(state.configuredSize));
    const finish = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
      const rectAfter = popup.getBoundingClientRect();
      state.moveCallback?.({ x: Math.round(rectAfter.left), y: Math.round(rectAfter.top) });
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  });
  handle.addEventListener('dblclick', () => resetEventPopupPosition(slot));
  popup.querySelector('.vn-event-close').addEventListener('click', () => closeEventPopup(slot));
  popup.querySelector('.vn-event-reset').addEventListener('click', () => resetEventPopupPosition(slot));
  bindGlobalListeners();
  return state;
}

export function showEventPopup({ path, title = '', type = 'image', size = 650, position = null, onMove = null, slot = 'right' }) {
  const state = ensurePopup(slot);
  clearMedia(state);
  state.configuredSize = size;
  state.moveCallback = onMove;
  const actualSize = fittedSize(size);
  state.popup.style.width = `${actualSize}px`;
  state.popup.style.height = `${actualSize}px`;
  state.title.textContent = title;
  const video = type === 'video';
  state.image.hidden = video;
  state.video.hidden = !video;
  if (video) {
    state.video.src = path;
    state.video.load();
  } else {
    state.image.src = path;
    state.image.alt = title || 'VN event image';
  }
  state.popup.hidden = false;
  place(state, position, actualSize);
  if (video) void state.video.play().catch(error => console.warn('[vn_npc_sprites] Event video autoplay failed.', error));
}

export function closeEventPopup(slot = null) {
  const states = slot === null ? popups.values() : [popups.get(normalizeSlot(slot))].filter(Boolean);
  for (const state of states) {
    state.popup.hidden = true;
    clearMedia(state);
  }
}

export function resetEventPopupPosition(slot = 'right') {
  const state = popups.get(normalizeSlot(slot));
  if (!state) return;
  const size = fittedSize(state.configuredSize);
  const position = place(state, null, size);
  state.moveCallback?.(position);
}

export function removeEventPopup() {
  for (const state of popups.values()) state.popup.remove();
  popups.clear();
}
