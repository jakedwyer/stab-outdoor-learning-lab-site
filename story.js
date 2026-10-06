// Load the player and composition only when the visitor asks to see the story.
const dialog = document.getElementById('story-dialog');
const stage = document.getElementById('story-stage');
const opener = document.getElementById('story-open');
const chapters = [...dialog.querySelectorAll('[data-story-time]')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const captions = [
  'A small discovery. A bigger world.',
  'One more rung. A little braver.',
  'What if? Let’s find out.',
  'Eight places. One place to grow.'
];
let player;
let loading;
let chapter = -1;

function showChapter(time) {
  const next = Math.min(3, Math.max(0, Math.floor(time / 7)));
  if (next === chapter) return;
  chapter = next;
  chapters.forEach((button, i) => button.setAttribute('aria-current', String(i === next)));
  document.getElementById('story-caption').textContent = captions[next];
}
function showError() {
  const message = document.getElementById('story-loading');
  message.hidden = false;
  message.textContent = 'The introduction could not load. You can still explore all eight places below.';
  if (player) { player.pause(); player.hidden = true; }
  chapters.forEach(button => { button.disabled = true; });
}
async function prepareStory() {
  await import('./vendor/hyperframes/hyperframes-player.js');
  const portrait = matchMedia('(max-width: 760px)').matches;
  player = document.createElement('hyperframes-player');
  player.setAttribute('width', portrait ? '720' : '1280');
  player.setAttribute('height', portrait ? '1000' : '720');
  player.setAttribute('controls', '');
  player.setAttribute('audio-locked', '');
  player.setAttribute('aria-label', 'Learning by Doing introduction');
  player.setAttribute('src', `story/${portrait ? 'portrait' : 'landscape'}/index.html`);
  stage.classList.toggle('portrait', portrait);
  player.addEventListener('ready', () => {
    document.getElementById('story-loading').hidden = true;
    chapters.forEach(button => { button.disabled = false; });
    showChapter(0);
    // Reduced-motion visitors get a still, with playback available on request.
    if (reducedMotion.matches) player.seek(1.5);
    else if (dialog.open && !document.hidden) player.play();
  });
  player.addEventListener('timeupdate', event => showChapter(event.detail.currentTime));
  player.addEventListener('error', showError);
  player.addEventListener('ended', () => {
    document.getElementById('story-caption').textContent = 'Now find your place in the landscape.';
  });
  stage.append(player);
}
opener.addEventListener('click', async () => {
  dialog.showModal();
  if (!loading) {
    chapters.forEach(button => { button.disabled = true; });
    loading = prepareStory().catch(showError);
  }
  await loading;
});
document.getElementById('story-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => player?.pause());
document.addEventListener('visibilitychange', () => { if (document.hidden) player?.pause(); });
chapters.forEach(button => button.addEventListener('click', () => {
  const time = Number(button.dataset.storyTime);
  player?.seek(time + 1.5);
  showChapter(time);
  if (reducedMotion.matches) player?.pause();
}));
document.getElementById('story-explore').addEventListener('click', () => {
  dialog.close();
  document.getElementById('enter').click();
  document.getElementById('design-mode').focus();
});
