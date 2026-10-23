(() => {
  const video = document.getElementById('digitalBackground');
  const control = document.getElementById('motion');
  if (!video || !control || !window.kodiakMedia) return;
  let paused = control.getAttribute('aria-pressed') === 'true';
  if (paused) window.kodiakMedia.pause(video);
  document.addEventListener('kodiak:motion-change', event => {
    const next = event.detail.paused;
    if (next) window.kodiakMedia.pause(video);
    else if (paused) window.kodiakMedia.play(video);
    paused = next;
  });
})();
