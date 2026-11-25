const links = Array.from(document.querySelectorAll('.box'));
const library = document.querySelector('#library');
const stage = document.querySelector('#stage');
const screen = document.querySelector('#screen');
const help = document.querySelector('#help');
const expand = document.querySelector('#expand');
let currentLink;

function renderRoute() {
  const link = links.find(item => item.hash === location.hash);
  if (link === currentLink) return;
  const previous = currentLink;
  currentLink = link;
  screen.replaceChildren();
  stage.hidden = !link;
  library.hidden = Boolean(link);
  document.body.style.overflow = link ? 'hidden' : '';
  if (!link) {
    document.title = 'The Diwali Arcade · Khel Katha';
    previous?.focus({preventScroll:true});
    return;
  }
  const name = link.querySelector('h2').textContent;
  const frame = document.createElement('iframe');
  frame.title = name;
  frame.src = link.hash.slice(1) + '/index.html';
  frame.addEventListener('load', () => frame.focus());
  document.querySelector('#game-title').textContent = name;
  document.title = name + ' · The Diwali Arcade';
  screen.append(frame);
}

window.addEventListener('hashchange', renderRoute);
renderRoute();
document.querySelector('#library-back').addEventListener('click', () => {
  history.replaceState(null, '', location.pathname + location.search);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  renderRoute();
});
if (!stage.requestFullscreen || !document.fullscreenEnabled) expand.hidden = true;
expand.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.requestFullscreen();
  } catch { expand.hidden = true; }
});
document.addEventListener('fullscreenchange', () => {
  expand.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen';
});
document.querySelector('#help-open').addEventListener('click', () => help.showModal());
for (const id of ['help-close', 'choose']) {
  document.getElementById(id).addEventListener('click', () => help.close());
}
help.addEventListener('click', event => {
  if (event.target === help) help.close();
});
window.addEventListener('keydown', event => {
  if (currentLink || help.open || event.altKey || event.metaKey || event.ctrlKey) return;
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const index = links.indexOf(document.activeElement);
  const next = index === -1 ? (event.key === 'ArrowRight' ? 0 : links.length - 1) :
    (index + (event.key === 'ArrowRight' ? 1 : -1) + links.length) % links.length;
  links[next].focus();
});

const viewToggle = document.querySelector('#view-toggle');
viewToggle.addEventListener('click', () => {
  const gameplay = viewToggle.getAttribute('aria-pressed') !== 'true';
  viewToggle.setAttribute('aria-pressed', String(gameplay));
  document.querySelector('.worlds').classList.toggle('game-views', gameplay);
  for (const link of links) {
    const image = link.querySelector('.cover img');
    image.dataset.coverAlt ??= image.alt;
    const world = link.hash.slice(1);
    image.src = 'art/' + world + (gameplay ? '-game.jpg' : '.jpg');
    image.alt = gameplay ? link.querySelector('h2').textContent + ' gameplay screen' : image.dataset.coverAlt;
  }
});
