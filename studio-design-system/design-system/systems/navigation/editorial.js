(() => {
  const hero = document.querySelector('.hero video');
  const button = document.querySelector('.play');
  const mobile = matchMedia('(max-width:760px)');
  const rail = document.querySelector('.rail');
  const intro = document.querySelector('.intro');
  const nav = document.querySelector('.rail nav');
  const sections = [...document.querySelectorAll('[data-section]')];
  const links = [...document.querySelectorAll('.rail nav a')];
  function label() {
    if (!button || !hero) return;
    let caption = button.querySelector('[data-video-label]');
    if (!caption) {
      for (const node of [...button.childNodes]) if (node.nodeType === Node.TEXT_NODE) node.remove();
      caption = document.createElement('span'); caption.dataset.videoLabel = ''; button.append(caption);
    }
    caption.textContent = hero.paused ? 'เล่นวิดีโอ' : 'หยุดวิดีโอ';
    button.setAttribute('aria-pressed', String(!hero.paused));
    button.dispatchEvent(new CustomEvent('kdek-video-state', {detail: {paused: hero.paused}}));
  }
  label();
  hero?.addEventListener('play', label);
  hero?.addEventListener('pause', label);
  hero?.addEventListener('error', label);
  if (button && hero) button.onclick = () => {
    if (hero.paused) window.kodiakMedia.play(hero);
    else window.kodiakMedia.pause(hero);
    label();
  };
  function updateReadingPosition() {
    const stuck = mobile.matches && intro.getBoundingClientRect().bottom <= 76;
    if (nav && rail) {
      // Reserve the same height when the horizontal navigation becomes fixed.
      if (stuck && !document.body.classList.contains('case-nav-stuck')) {
        rail.style.setProperty('--nav-space', `${nav.offsetHeight + 16}px`);
      }
      document.body.classList.toggle('case-nav-stuck', stuck);
      rail.classList.toggle('case-nav-stuck', stuck);
    }
    const readingLine = mobile.matches ? 165 : innerHeight * .32;
    let id = sections[0]?.id;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= readingLine) id = section.id;
    }
    links.forEach(link => {
      if (link.hash === `#${id}`) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  let scheduled = false;
  function scheduleUpdate() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {scheduled = false; updateReadingPosition();});
  }
  addEventListener('scroll', scheduleUpdate, {passive: true});
  addEventListener('resize', scheduleUpdate, {passive: true});
  mobile.addEventListener?.('change', scheduleUpdate);
  updateReadingPosition();
  window.kodiakReady?.then(() => {
    document.documentElement.classList.add('project-ready');
    scheduleUpdate();
    window.kodiakMedia?.refresh();
  });
})();
