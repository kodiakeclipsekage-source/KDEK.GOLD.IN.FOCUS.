(() => {
  if (window.kodiakMedia) return;
  const states = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width:760px), (pointer:coarse)');
  const connection = navigator.connection;
  let idleTimer, settleTimer, touching = false, scrolling = false, stopped = false;
  const ready = () => !window.kodiakReady || window.kodiakAssetsReady === true;
  function policy() {
    const constrained = compact.matches || (navigator.deviceMemory > 0 && navigator.deviceMemory <= 4)
      || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4)
      || connection?.saveData || /^(slow-)?2g$/.test(connection?.effectiveType || '');
    return {playing: constrained ? 1 : 2, resident: constrained ? 2 : 4, releaseAfter: constrained ? 2000 : 5000};
  }
  function setScrolling(value) {
    if (scrolling === value) return;
    scrolling = window.kodiakScrolling = value;
    document.dispatchEvent(new CustomEvent('kodiak:scroll-state', {detail: {scrolling: value}}));
  }
  function pause(state) {
    state.wanted = false;
    state.generation++;
    if (!state.video.paused) {state.automaticPauses++; state.video.pause();}
    else if (state.pending) state.video.pause();
  }
  function release(state) {
    clearTimeout(state.releaseTimer);
    if (!state.video.getAttribute('src')) return;
    state.time = Number.isFinite(state.video.currentTime) ? state.video.currentTime : 0;
    pause(state);
    state.video.removeAttribute('src');
    state.video.preload = 'none';
    state.video.load();
    state.video.dataset.mediaState = 'poster';
  }
  function releaseLater(state) {
    clearTimeout(state.releaseTimer);
    if (state.near || state.ratio > 0 || !state.video.getAttribute('src')) return;
    state.releaseTimer = setTimeout(() => {
      if (!state.near && !state.ratio && ready()) release(state);
    }, policy().releaseAfter);
  }
  function trim(protectedStates = new Set()) {
    const loaded = [...states.values()].filter(state => state.video.getAttribute('src'));
    const evictable = loaded.filter(state => !protectedStates.has(state))
      .sort((a,b) => Number(a.ratio > 0) - Number(b.ratio > 0) || a.lastUsed - b.lastUsed);
    let excess = loaded.length - policy().resident;
    for (const state of evictable) {if (excess-- <= 0) break; release(state);}
  }
  function attach(state) {
    const video = state.video;
    if (!video.getAttribute('src')) {video.preload = 'metadata'; video.src = video.dataset.src;}
    state.lastUsed = performance.now();
  }
  function requestPlay(state) {
    state.wanted = true;
    if (!state.video.paused || state.pending) return;
    attach(state);
    state.video.dataset.mediaState = 'active';
    state.pending = true;
    const generation = state.generation;
    Promise.resolve().then(() => {
      if (!state.wanted || document.hidden || stopped || generation !== state.generation) return;
      return state.video.play();
    }).then(() => {
      if (!state.wanted || document.hidden || stopped || generation !== state.generation) {
        if (!state.video.paused) {state.automaticPauses++; state.video.pause();}
      }
    }).catch(error => {
      if (error?.name !== 'AbortError') state.blocked = true;
    }).finally(() => {
      state.pending = false;
      if (state.wanted && state.video.paused && !state.blocked && !document.hidden && !stopped) schedule();
    });
  }
  function score(state) {
    const rect = state.video.getBoundingClientRect();
    const distance = Math.abs((rect.top + rect.bottom) / 2 - innerHeight / 2) / Math.max(1, innerHeight);
    return (state.manual ? 10 : 0) + state.ratio - distance * .2 + (!state.video.paused ? .08 : 0);
  }
  function update() {
    idleTimer = 0;
    if (stopped || document.hidden || !ready()) return;
    const candidates = [...states.values()].filter(state => state.ratio >= .15 && !state.userPaused
      && !state.blocked && (!state.manualOnly || state.manual) && (!reduced.matches || state.manual));
    candidates.sort((a,b) => score(b) - score(a));
    const selected = new Set(candidates.slice(0, policy().playing));
    for (const state of states.values()) if (!selected.has(state)) {pause(state); releaseLater(state);}
    trim(selected);
    for (const state of selected) {clearTimeout(state.releaseTimer); requestPlay(state);}
    // Attaching a new winner may replace an old paused buffer.
    trim(selected);
  }
  function schedule() {
    // Throttle selection without waiting for scrolling or a touch gesture to end.
    if (idleTimer || stopped) return;
    idleTimer = setTimeout(update, 80);
  }
  function activity() {
    if (stopped) return;
    setScrolling(true);
    schedule();
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      if (touching) return;
      setScrolling(false);
      schedule();
    }, compact.matches ? 360 : 280);
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = states.get(entry.target); if (!state) continue;
      const ratio = entry.isIntersecting ? entry.intersectionRatio ?? 1 : 0;
      if (state.ratio === 0 && ratio > 0) state.blocked = false;
      state.ratio = ratio;
      if (ratio < .15) {pause(state); releaseLater(state);}
    }
    schedule();
  }, {threshold: [0, .15, .35, .6, 1]});
  const proximity = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = states.get(entry.target); if (!state) continue;
      state.near = entry.isIntersecting;
      if (state.near) clearTimeout(state.releaseTimer); else releaseLater(state);
    }
  }, {rootMargin: '400px 0px', threshold: 0});
  function register(video) {
    if (states.has(video)) return states.get(video);
    if (!video.dataset.src) return null;
    video.muted = video.defaultMuted = video.loop = video.playsInline = true;
    video.autoplay = false; video.preload = 'none';
    const state = {video, ratio: 0, near: false, wanted: false, pending: false, blocked: false,
      userPaused: false, manual: false, manualOnly: video.hasAttribute('data-media-manual'),
      generation: 0, automaticPauses: 0, lastUsed: 0, time: 0};
    states.set(video, state);
    const prepareControl = event => {
      if (!video.controls || (event.type === 'keydown' && ![' ','Enter','k'].includes(event.key))) return;
      state.blocked = false;
      attach(state); trim(new Set([state]));
    };
    video.addEventListener('pointerdown', prepareControl, {capture:true});
    video.addEventListener('keydown', prepareControl, {capture:true});
    video.addEventListener('loadedmetadata', () => {
      if (state.time > 0) {
        try {video.currentTime = Number.isFinite(video.duration) ? Math.min(state.time, Math.max(0,video.duration-.1)) : state.time;} catch {}
        state.time = 0;
      }
    });
    video.addEventListener('play', () => {
      if (!state.wanted && !state.pending) {state.manual = true; state.userPaused = false; state.blocked = false;}
      if (document.hidden || stopped || (!state.pending && state.ratio < .15)) {pause(state); return;}
      if (state.manual) {
        const others = [...states.values()].filter(other => other !== state && !other.video.paused)
          .sort((a,b) => score(b) - score(a));
        for (const other of others.slice(Math.max(0,policy().playing-1))) pause(other);
      }
      state.lastUsed = performance.now();
      trim(new Set([...states.values()].filter(other => !other.video.paused || other.pending)));
    });
    video.addEventListener('pause', () => {
      if (state.automaticPauses) state.automaticPauses--;
      else {state.userPaused = true; state.manual = false; state.wanted = false; state.generation++;}
    });
    observer.observe(video); proximity.observe(video);
    return state;
  }
  function scan(node) {
    if (node instanceof HTMLVideoElement) register(node);
    node.querySelectorAll?.('video[data-src]').forEach(register);
  }
  window.kodiakMedia = {
    register,
    refresh: schedule,
    play(video) {
      const state = register(video); if (!state) return;
      state.userPaused = state.blocked = false; state.manual = true; state.ratio = Math.max(.15,state.ratio);
      clearTimeout(idleTimer); idleTimer = 0;
      for (const other of states.values()) if (other !== state) pause(other);
      requestPlay(state); trim(new Set([state]));
    },
    pause(video) {const state = states.get(video); if (state) {state.userPaused = true; state.manual = false; pause(state);}},
    status() {return {...policy(), scrolling, attached: [...states.values()].filter(s => s.video.getAttribute('src')).length,
      active: [...states.values()].filter(s => !s.video.paused).length};}
  };
  scan(document);
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) scan(node);
    for (const [video,state] of states) if (!video.isConnected) {
      release(state); observer.unobserve(video); proximity.unobserve(video); states.delete(video);
    }
  }).observe(document.body, {childList: true, subtree: true});
  addEventListener('scroll', activity, {passive:true});
  document.addEventListener('scroll', activity, {passive:true,capture:true});
  addEventListener('wheel', activity, {passive:true});
  // A tap on native pause/seek controls must not turn into a scroll pause first.
  addEventListener('touchstart', () => {touching = true;}, {passive:true});
  const endTouch = () => {touching = false; if (scrolling) activity(); else schedule();};
  addEventListener('touchend', endTouch, {passive:true}); addEventListener('touchcancel', endTouch, {passive:true});
  addEventListener('resize', schedule, {passive:true});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {for (const state of states.values()) {pause(state); releaseLater(state);}}
    else schedule();
  });
  for (const query of [reduced,compact]) query.addEventListener?.('change', () => {
    for (const state of states.values()) pause(state);
    schedule();
  });
  connection?.addEventListener?.('change', schedule);
  document.addEventListener('kodiak:assets-ready', schedule);
  window.kodiakReady?.then(schedule);
  addEventListener('pagehide', () => {stopped = true; clearTimeout(idleTimer); clearTimeout(settleTimer); idleTimer = 0; for (const state of states.values()) release(state);});
  addEventListener('pageshow', () => {stopped = false; setScrolling(false); schedule();});
  schedule();
})();
