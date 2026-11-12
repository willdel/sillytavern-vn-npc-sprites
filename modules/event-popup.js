let popup;
let titleElement;
let imageElement;
let videoElement;
let moveCallback;
let configuredSize = 650;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function fittedSize(size) {
  return Math.max(180, Math.min(Number(size) || 650, window.innerWidth - 24, window.innerHeight - 48));
}

function place(position, size) {
  const fallback = { x: window.innerWidth - size - 24, y: 48 };
  const requested = position && Number.isFinite(position.x) && Number.isFinite(position.y) ? position : fallback;
  const next = {
    x: clamp(requested.x, 0, window.innerWidth - size),
    y: clamp(requested.y, 32, window.innerHeight - size),
  };
  popup.style.left = `${next.x}px`;
  popup.style.top = `${next.y}px`;
  return next;
}

function ensurePopup() {
  if (popup) return popup;
  popup = document.createElement('div');
  popup.id = 'vn-event-popup';
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
  titleElement = popup.querySelector('.vn-event-title');
  imageElement = popup.querySelector('.vn-event-image');
  videoElement = popup.querySelector('.vn-event-video');
  const handle = popup.querySelector('.vn-event-handle');
  handle.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    const rect = popup.getBoundingClientRect();
    const offset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    handle.setPointerCapture(event.pointerId);
    const move = current => place({ x: current.clientX - offset.x, y: current.clientY - offset.y }, fittedSize(configuredSize));
    const finish = current => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
      const rectAfter = popup.getBoundingClientRect();
      moveCallback?.({ x: Math.round(rectAfter.left), y: Math.round(rectAfter.top) });
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  });
  handle.addEventListener('dblclick', () => resetEventPopupPosition());
  popup.querySelector('.vn-event-close').addEventListener('click', closeEventPopup);
  popup.querySelector('.vn-event-reset').addEventListener('click', resetEventPopupPosition);
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !popup.hidden) closeEventPopup();
  });
  window.addEventListener('resize', () => {
    if (!popup.hidden) place({ x: popup.offsetLeft, y: popup.offsetTop }, fittedSize(configuredSize));
  });
  return popup;
}

function clearMedia() {
  imageElement?.removeAttribute('src');
  if (videoElement) {
    videoElement.pause();
    videoElement.removeAttribute('src');
    videoElement.load();
  }
}

export function showEventPopup({ path, title = '', type = 'image', size = 650, position = null, onMove = null }) {
  ensurePopup();
  clearMedia();
  configuredSize = size;
  moveCallback = onMove;
  const actualSize = fittedSize(size);
  popup.style.width = `${actualSize}px`;
  popup.style.height = `${actualSize}px`;
  titleElement.textContent = title;
  const video = type === 'video';
  imageElement.hidden = video;
  videoElement.hidden = !video;
  if (video) {
    videoElement.src = path;
    videoElement.load();
  } else {
    imageElement.src = path;
    imageElement.alt = title || 'VN event image';
  }
  popup.hidden = false;
  place(position, actualSize);
  if (video) void videoElement.play().catch(error => console.warn('[vn_npc_sprites] Event video autoplay failed.', error));
}

export function closeEventPopup() {
  if (!popup) return;
  popup.hidden = true;
  clearMedia();
}

export function resetEventPopupPosition() {
  if (!popup) return;
  const size = fittedSize(configuredSize);
  const position = place(null, size);
  moveCallback?.(position);
}

export function removeEventPopup() {
  popup?.remove();
  popup = null;
  titleElement = null;
  imageElement = null;
  videoElement = null;
}

