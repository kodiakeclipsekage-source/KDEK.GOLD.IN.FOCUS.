(() => {
  const root=document.documentElement;
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  let timer,leaving=false;
  function overlay(state) {
    document.getElementById('resumeTransition')?.remove();
    const layer=document.createElement('div');layer.id='resumeTransition';layer.className=state;layer.setAttribute('aria-hidden','true');
    layer.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice"><defs><mask id="resumeShutterMask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000"><rect width="1000" height="1000" fill="white"/><g transform="translate(500 500)"><polygon class="resume-shutter-aperture" points="0,-230 199,-115 199,115 0,230 -199,115 -199,-115" fill="black"/></g></mask></defs><g mask="url(#resumeShutterMask)"><rect width="1000" height="1000" fill="#111111"/><path d="M500 500 500 0M500 500 1000 210M500 500 1000 790M500 500 500 1000M500 500 0 790M500 500 0 210" fill="none" stroke="#f5f5f5" stroke-opacity=".055" stroke-width="1"/></g></svg>';
    document.body.append(layer);
    return layer;
  }
  function cleanup() {
    clearTimeout(timer);clearTimeout(window.resumeRevealFallback);
    document.getElementById('resumeTransition')?.remove();
    root.classList.remove('resume-entering','resume-opening','resume-leaving');
    leaving=false;
  }
  const warmed=new Set();
  function warm(event){
    if(navigator.connection?.saveData)return;
    const anchor=event.target.closest?.('a[href]');if(!anchor||anchor.hasAttribute('download')||(anchor.target&&anchor.target!=='_self'))return;
    const target=new URL(anchor.href,location.href);if(target.origin!==location.origin||!/^\/resume\/?$/.test(target.pathname)||/^\/resume\/?$/.test(location.pathname))return;
    const assets=[target.href,'/studio-tokens.css','/studio-typography.css','/project-editorial.css','/brand-sizing.css','/resume.css','/experience.css','/resume-transition.css','/resume.js','/project-page.js','/studios.js','/fonts/the-bold-font.woff','/fonts/kanit-400.woff','/brand-badge.webp'];
    for(const href of assets){if(warmed.has(href))continue;warmed.add(href);const link=document.createElement('link');link.rel='prefetch';link.href=href;document.head.append(link);}
  }
  document.addEventListener('pointerover',warm,{passive:true});document.addEventListener('focusin',warm);document.addEventListener('pointerdown',warm,{passive:true});
  document.addEventListener('click',event=>{
    warm(event);
    const anchor=event.target.closest?.('a[href]');
    if (!anchor || event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.hasAttribute('download') || (anchor.target && anchor.target!=='_self')) return;
    const target=new URL(anchor.href,location.href);
    if (target.origin!==location.origin || !/^\/resume\/?$/.test(target.pathname) || target.pathname.replace(/\/$/,'')===location.pathname.replace(/\/$/,'') || preference.matches) return;
    event.preventDefault();
    if (leaving) return;
    leaving=true;root.classList.add('resume-leaving');overlay('is-closing');
    timer=setTimeout(()=>location.assign(target.href),{{motion:shutterCloseMs}}+{{motion:shutterCleanupPaddingMs}});
  });
  addEventListener('pageshow',event=>{if(event.persisted)cleanup();});
  if (!root.classList.contains('resume-entering')) return;
  if (preference.matches) {cleanup();return;}
  const layer=overlay('is-covered');
  // The V1 aperture opens after the first covered paint; fonts and images do not block it.
  requestAnimationFrame(()=>{
    // The inline fail-open guard may have already revealed a slow document.
    if (!layer.isConnected) return;
    root.classList.remove('resume-entering');root.classList.add('resume-opening');
    layer.className='is-opening';
    timer=setTimeout(cleanup,{{motion:shutterOpenMs}}+{{motion:shutterCleanupPaddingMs}});
  });
})();
