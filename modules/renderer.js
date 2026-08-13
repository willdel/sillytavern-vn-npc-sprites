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

export function renderNpcSprite({ name, path, reason }) {
  const root = getRoot();
  let figure = root.querySelector('.vn-npc-sprite');
  if (!figure) {
    figure = document.createElement('figure');
    figure.className = 'vn-npc-sprite is-active';
    const image = document.createElement('img');
    image.alt = '';
    image.addEventListener('error', () => clearNpcSprites());
    figure.append(image);
    root.append(figure);
  }
  figure.dataset.character = name;
  figure.dataset.detection = reason;
  figure.querySelector('img').src = path;
  root.classList.add('has-sprites');
  document.body.classList.add('vn-npc-routing-active');
}

export function clearNpcSprites() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return;
  root.replaceChildren();
  root.classList.remove('has-sprites');
  document.body.classList.remove('vn-npc-routing-active');
}

export function removeRenderer() {
  document.getElementById(ROOT_ID)?.remove();
  document.body.classList.remove('vn-npc-routing-active');
}
