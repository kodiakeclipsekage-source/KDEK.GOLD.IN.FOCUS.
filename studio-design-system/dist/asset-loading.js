(() => {
  const overlay=document.getElementById('assetLoader');if(!overlay)return;
  window.kodiakAssetLoaderStarted=true;
  const root=document.documentElement,note=document.getElementById('assetLoaderNote'),actions=document.getElementById('assetLoaderActions');
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  let released=false;
  function bounded(promise,label,timeout=3000){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(label)),timeout)})]).finally(()=>clearTimeout(timer))}
  function release(){
    if(released)return;released=true;
    root.classList.remove('assets-loading');root.classList.add('assets-revealing');document.body.setAttribute('aria-busy','false');
    setTimeout(()=>{overlay.remove();root.classList.remove('assets-revealing');root.classList.add('assets-ready');window.kodiakAssetsReady=true;window.resolveKodiakReady?.();document.dispatchEvent(new CustomEvent('kodiak:assets-ready'))},preference.matches?0:420);
  }
  window.releaseKodiakAssets=release;document.getElementById('retryAssets').onclick=()=>location.reload();document.body.setAttribute('aria-busy','true');
  function waitForImage(image){
    image.loading='eager';image.fetchPriority='high';image.dataset.priorityAsset='true';let clean=()=>{};
    const task=new Promise((resolve,reject)=>{
      const failed=()=>reject(Error('image'));
      const loaded=()=>{if(image.decode)image.decode().then(resolve,reject);else resolve()};
      clean=()=>{image.removeEventListener('load',loaded);image.removeEventListener('error',failed)};
      if(image.complete){image.naturalWidth?loaded():failed();return}
      image.addEventListener('load',loaded,{once:true});image.addEventListener('error',failed,{once:true});
    });return bounded(task,'image',3000).finally(()=>clean());
  }
  function mediaFallback(video){
    const home=video.closest('#homeMedia'),detail=video.closest('.hero'),card=video.closest('.project-art');
    const hint=home?document.getElementById('homeError'):detail?.querySelector('.media-load-note')||card?.querySelector('.media-fail');
    if(hint){hint.hidden=false;video.addEventListener('loadeddata',()=>hint.hidden=true,{once:true})}
    video.dataset.loadState='unavailable';
  }
  function waitForVideo(video){
    video.dataset.priorityAsset='true';let clean=()=>{};
    const task=new Promise((resolve,reject)=>{
      const loaded=()=>{video.dataset.loadState='ready';resolve()},failed=()=>reject(Error('video'));
      clean=()=>{video.removeEventListener('loadeddata',loaded);video.removeEventListener('error',failed)};
      if(video.readyState>=2){loaded();return}if(video.error){failed();return}
      video.addEventListener('loadeddata',loaded,{once:true});video.addEventListener('error',failed,{once:true});video.preload='auto';
      if(!video.getAttribute('src')&&video.dataset.src)video.src=video.dataset.src;video.load();
    });return bounded(task,'video timeout',2500).catch(error=>{
      if(error.message==='video timeout'){
        video.dataset.loadState='deferred';
        video.addEventListener('loadeddata',()=>video.dataset.loadState='ready',{once:true});
      }else mediaFallback(video);
      throw error;
    }).finally(()=>clean());
  }
  async function digitalAnimation(){
    const container=document.getElementById('digitalShadowAnimation');if(!container)return;
    try{
      const response=await bounded(fetch('/animations/kdek.404.json'),'digital animation');if(!response.ok||!window.lottie)throw Error('digital animation');
      const animation=lottie.loadAnimation({container,renderer:'svg',loop:true,autoplay:false,animationData:await response.json()});
      await bounded(new Promise((resolve,reject)=>{animation.addEventListener('DOMLoaded',resolve);animation.addEventListener('data_failed',reject)}),'digital animation');
      let visible=false,paused=document.getElementById('motion')?.getAttribute('aria-pressed')==='true';
      const sync=()=>{if(preference.matches)animation.goToAndStop(0,true);else if(visible&&!paused&&!document.hidden&&!window.kodiakScrolling)animation.play();else animation.pause()};
      const observer=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);sync()},{threshold:.05});observer.observe(container);
      document.addEventListener('kodiak:motion-change',event=>{paused=event.detail.paused;sync()});document.addEventListener('visibilitychange',sync);document.addEventListener('kodiak:scroll-state',sync);preference.addEventListener('change',sync);sync();
    }catch{container.textContent='404';container.style.font='600 80px/1 Bold,sans-serif'}
  }
  async function start(){
    const home=document.querySelector('.home-screen');
    const requested=document.getElementById(location.hash.slice(1));
    const entry=requested||home||document.querySelector('main .hero')||document.body;
    const jobs=[];const add=(label,promise)=>jobs.push({label,promise});
    const images=new Set(document.querySelectorAll('.home-brand img,header .brand img'));
    if(entry!==home){const first=entry.querySelector('img[src]');if(first)images.add(first)}
    for(const image of images)add('image',waitForImage(image));
    const video=entry.querySelector('video');if(video)add('video',waitForVideo(video));
    if(document.fonts){add('English font',bounded(document.fonts.load('600 16px Bold','BORN FROM NATURE'),'font',2000));add('Thai font',bounded(document.fonts.load('600 16px Kanit','กำเนิดจากธรรมชาติ'),'font',2000))}
    for(const link of document.querySelectorAll('link[rel="stylesheet"]')){
      if(link.sheet)continue;
      let clean=()=>{};const task=new Promise((resolve,reject)=>{const loaded=()=>resolve(),failed=()=>reject(Error('stylesheet'));clean=()=>{link.removeEventListener('load',loaded);link.removeEventListener('error',failed)};link.addEventListener('load',loaded,{once:true});link.addEventListener('error',failed,{once:true})});
      add('stylesheet',bounded(task,'stylesheet').finally(()=>clean()));
    }
    // Offscreen project videos and decorative animation files never block entry.
    const results=await Promise.allSettled(jobs.map(job=>job.promise));
    window.kodiakLoadSummary={critical:jobs.length,failed:results.flatMap((r,i)=>r.status==='rejected'?[jobs[i].label]:[])};
    note.textContent='หน้าเว็บพร้อมแล้ว';release();
    window.kodiakReady.then(()=>{
      if(window.requestIdleCallback)requestIdleCallback(digitalAnimation,{timeout:1200});else setTimeout(digitalAnimation,0);
    });
  }
  note.textContent='กำลังเตรียมหน้าเว็บ';start().catch(()=>{note.textContent='โหลดหน้าเว็บไม่สำเร็จ ลองอีกครั้งได้ครับ';actions.hidden=false});
})();
