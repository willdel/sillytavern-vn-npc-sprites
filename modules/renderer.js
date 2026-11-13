const ROOT_ID = 'vn-npc-sprite-layer';

function getRoot() {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = ROOT_ID;
    root.setAttribute('aria-hidden', 'true');
    document.body.append(root);
  }
  return root;
}

function centerActiveSprite(items) {
  const activeIndex = items.findIndex(item => item.active);
  if (activeIndex < 0 || items.length < 2) return items;
  const arranged = [...items];
  const [active] = arranged.splice(activeIndex, 1);
  arranged.splice(Math.ceil(arranged.length / 2), 0, active);
  return arranged;
}

function stopVideos(root) {
  root.querySelectorAll('video').forEach(video => {
    video.pause();
    video.removeAttribute('src');
    video.load();
  });
}

function createImage(item, figure) {
  const image = document.createElement('img');
  image.alt = '';
  image.src = item.path;
  image.addEventListener('error', () => figure.remove());
  return image;
}

function createVideo(item, figure) {
  const video = document.createElement('video');
  video.className = 'vn-npc-sprite-video';
  video.autoplay = true;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.poster = item.path;
  video.src = item.videoPath;
  video.addEventListener('error', () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.replaceWith(createImage(item, figure));
  }, { once: true });
  video.addEventListener('canplay', () => void video.play().catch(error => console.warn('[vn_npc_sprites] Sprite video autoplay failed.', error)), { once: true });
  return video;
}

export function renderNpcSprites(items) {
  const root = getRoot();
  stopVideos(root);
  root.replaceChildren();
  for (const item of centerActiveSprite(items.slice(0, 5))) {
    const figure = document.createElement('figure');
    figure.className = `vn-npc-sprite${item.active ? ' is-active' : ''}${item.cardAvatar ? ' is-card-avatar' : ''}`;
    figure.dataset.character = item.name;
    figure.dataset.detection = item.reason;
    figure.classList.toggle('is-video', Boolean(item.videoPath));
    figure.append(item.videoPath ? createVideo(item, figure) : createImage(item, figure));
    root.append(figure);
  }
  root.classList.toggle('has-sprites', items.length > 0);
  document.body.classList.toggle('vn-npc-routing-active', items.length > 0);
}

export function clearNpcSprites() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return;
  stopVideos(root);
  root.replaceChildren();
  root.classList.remove('has-sprites');
  document.body.classList.remove('vn-npc-routing-active');
}

export function removeRenderer() {
  const root = document.getElementById(ROOT_ID);
  if (root) stopVideos(root);
  root?.remove();
  document.body.classList.remove('vn-npc-routing-active');
}
