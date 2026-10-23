(() => {
  const root = document.querySelector('.work-index');
  const rail = root?.querySelector('.rail');
  const preview = root?.querySelector('.work-preview');
  if (!rail || !preview) return;
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const template = document.createElement('div');
  template.className = 'work-preview-panel';
  template.append(...preview.childNodes);
  let hovered = null;
  let focused = null;
  let shown = null;
  let currentPanel = null;
  let showTimer, hideTimer;
  function render(card) {
    rail.classList.add('is-previewing');
    if (shown === card) return;
    shown = card;
    // Keep the outgoing text intact while the next project fades in.
    const panel = template.cloneNode(true);
    const number = card.querySelector('.project-number')?.textContent.match(/\d+/)?.[0] || '';
    panel.querySelector('.work-preview-mark').textContent = number.padStart(2, '0');
    panel.querySelector('strong').textContent = card.querySelector('.project-title')?.textContent || '';
    const teams = [...card.querySelectorAll('.team-mark-name')].map(node => node.textContent);
    panel.querySelector('[data-preview-team]').textContent = teams.length ? teams.join(' × ') : 'ยังไม่ระบุทีมสตูดิโอ';
    panel.querySelector('small').textContent = `PROJECT ${number.padStart(2, '0')}`;
    if (currentPanel) {
      const outgoing = currentPanel;
      outgoing.classList.remove('is-current');
      if (reduced.matches) outgoing.remove();
      else setTimeout(() => outgoing.remove(), 380);
    }
    currentPanel = panel;
    preview.append(panel);
    if (reduced.matches) panel.classList.add('is-current');
    else requestAnimationFrame(() => requestAnimationFrame(() => {
      if (currentPanel === panel) panel.classList.add('is-current');
    }));
  }
  function hide() {
    rail.classList.remove('is-previewing');
    shown = null;
  }
  function sync(immediate = false) {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    const card = hovered || focused;
    if (card) {
      if (immediate || reduced.matches) render(card);
      else showTimer = setTimeout(() => render(card), 60);
    } else if (immediate || reduced.matches) hide();
    // Bridge the narrow grid gutters without flashing the sidebar off and on.
    else hideTimer = setTimeout(hide, 160);
  }
  root.querySelectorAll('#workgrid > .project').forEach(card => {
    card.addEventListener('pointerenter', event => {if (event.pointerType !== 'touch') {hovered = card; sync();}});
    card.addEventListener('pointerleave', () => {if (hovered === card) {hovered = null; sync();}});
    card.addEventListener('focusin', () => {focused = card; sync(true);});
    card.addEventListener('focusout', event => {if (!card.contains(event.relatedTarget)) {focused = null; sync();}});
  });
  document.addEventListener('visibilitychange', () => {if (document.hidden) {hovered = null; focused = null; sync(true);}});
})();
