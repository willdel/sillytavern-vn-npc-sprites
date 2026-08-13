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

export function renderNpcSprites(items) {
  const root = getRoot();
  root.replaceChildren();
  for (const item of centerActiveSprite(items.slice(0, 5))) {
    const figure = document.createElement('figure');
    figure.className = `vn-npc-sprite${item.active ? ' is-active' : ''}`;
    figure.dataset.character = item.name;
    figure.dataset.detection = item.reason;
    const image = document.createElement('img');
    image.alt = '';
    image.src = item.path;
    image.addEventListener('error', () => figure.remove());
    figure.append(image);
    root.append(figure);
  }
  root.classList.toggle('has-sprites', items.length > 0);
  document.body.classList.toggle('vn-npc-routing-active', items.length > 0);
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
