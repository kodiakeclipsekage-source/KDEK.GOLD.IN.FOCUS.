/* Shared studio identities. Edit logo paths here for all portfolio references. */
(() => {
  const studios = Object.freeze(Object.fromEntries(Object.entries({
    kdek: {name: 'KDEK STUDIO.', logo: '/teams/kdek-studio.png?v=7238c8bf96', width: 1254, height: 1254, section: 'kdek-studio', wordmark: 'KDEK'},
    kawaii: {name: 'KawaiiSleepStudio', logo: '/teams/kawaii-sleep-wordmark.png', width: 512, height: 512, section: 'kawaii-studio', wordmark: 'KAWAIISLEEP'},
    kohaneko: {name: 'KohanekoStudio', logo: '/teams/kohaneko-studio.png', width: 1920, height: 1080, section: 'kohaneko-studio', wordmark: 'KOHANEKO'}
  }).map(([id, studio]) => [id, Object.freeze({id, ...studio, href: '/#' + studio.section, logoFit: 'contain'})])));
  function apply(scope = document) {
    scope.querySelectorAll('[data-studio-logo]').forEach(image => {
      const studio = studios[image.dataset.studioLogo];
      if (!studio) return;
      image.setAttribute('src', studio.logo);
      image.width = studio.width; image.height = studio.height;
      image.style.objectFit = studio.logoFit;
      if (!image.hasAttribute('data-experience-alt')) image.alt = studio.name + ' logo';
    });
    scope.querySelectorAll('[data-studio-link]').forEach(link => {
      const studio = studios[link.dataset.studioLink];
      if (studio) link.setAttribute('href', studio.href);
    });
    scope.querySelectorAll('[data-studio-name]').forEach(label => {
      const studio = studios[label.dataset.studioName];
      if (studio) label.textContent = studio.name;
    });
    scope.querySelectorAll('[data-studio-wordmark]').forEach(label => {
      const studio = studios[label.dataset.studioWordmark];
      if (!studio) return;
      const emphasis = document.createElement('em'); emphasis.textContent = 'STUDIO.';
      label.replaceChildren(document.createTextNode(studio.wordmark), document.createElement('br'), emphasis);
    });
  }
  window.kodiakStudios = Object.freeze({get: id => studios[id] || null, apply});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => apply(), {once: true});
  else apply();
})();
