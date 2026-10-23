(() => {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let clickData;
  const active=new Set();
  const copy=data=>JSON.parse(JSON.stringify(data));
  async function read(name){const r=await fetch('/animations/'+name+'.json');if(!r.ok)throw Error(name);return r.json()}
  function looping(container,data,{studio=false}={}){
    container.replaceChildren();container.classList.add(studio?'kdek-studio-animation':'kdek-chat-animation');if(!studio)container.setAttribute('aria-hidden','true');
    const animation=lottie.loadAnimation({container,renderer:'svg',loop:true,autoplay:false,animationData:copy(data)});
    return new Promise((resolve,reject)=>{
      animation.addEventListener('data_failed',()=>reject(Error('loop animation')));
      animation.addEventListener('DOMLoaded',()=>{
        let visible=false;
        const sync=()=>{
          if(reduced.matches)animation.goToAndStop(0,true);
          else if(visible&&window.kodiakAssetsReady&&!document.hidden&&!window.kodiakScrolling)animation.play();
          else animation.pause();
        };
        const observer=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);sync()},{threshold:.01});
        observer.observe(container);
        reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);document.addEventListener('kodiak:assets-ready',sync);document.addEventListener('kodiak:scroll-state',sync);
        window.kodiakReady?.then(sync);
        sync();resolve();
      });
    });
  }
  function social(container,data){
    const row=container.closest('.social-pending');
    const still=Math.min(data.op-data.ip-1,Math.round((data.op-data.ip)*.7));
    const animation=lottie.loadAnimation({container,renderer:'svg',loop:false,autoplay:false,animationData:copy(data)});
    return new Promise((resolve,reject)=>{
      animation.addEventListener('data_failed',()=>reject(Error('social animation')));
      animation.addEventListener('DOMLoaded',()=>{
        const rest=()=>animation.goToAndStop(still,true);
        row.addEventListener('pointerenter',()=>{if(window.kodiakAssetsReady&&!reduced.matches&&!document.hidden&&!window.kodiakScrolling)animation.goToAndPlay(0,true)});
        row.addEventListener('pointerleave',rest);
        animation.addEventListener('complete',rest);
        document.addEventListener('visibilitychange',()=>{if(document.hidden)rest()});document.addEventListener('kodiak:scroll-state',()=>{if(window.kodiakScrolling)rest()});reduced.addEventListener('change',rest);
        rest();resolve();
      });
    });
  }
  window.kodiakInteractionAssetsReady=Promise.all([read('kdek.chatbox'),read('kdek.click'),document.querySelector('.studio-logo-placeholder')?read('kdek.404'):Promise.resolve(null)]).then(async([chatData,data,studioData])=>{
    clickData=data;
    const containers=[...document.querySelectorAll('.rail-bottom .red-square,.mobile-talk-trigger > .kdek-chat-placeholder')];
    await Promise.all([...containers.map(container=>looping(container,chatData)),...Array.from(document.querySelectorAll('.studio-logo-placeholder'),container=>looping(container,studioData,{studio:true})),...Array.from(document.querySelectorAll('[data-social-animation]'),async container=>social(container,await read(container.dataset.socialAnimation)))]);
  });
  window.kodiakInteractionAssetsReady.catch(()=>{});
  document.addEventListener('click',event=>{
    if(!clickData||!window.kodiakAssetsReady||reduced.matches||event.detail===0)return;
    const layer=document.createElement('div');layer.className='kdek-click-animation';layer.setAttribute('aria-hidden','true');
    layer.style.left=event.clientX+'px';layer.style.top=event.clientY+'px';
    // Dialogs use the browser top layer, so their click effects belong inside them.
    (event.target.closest?.('dialog[open]')||document.body).append(layer);
    const animation=lottie.loadAnimation({container:layer,renderer:'svg',loop:false,autoplay:true,animationData:copy(clickData)});
    let timer;const finish=()=>{if(!active.has(finish))return;active.delete(finish);clearTimeout(timer);animation.destroy();layer.remove()};
    active.add(finish);animation.addEventListener('complete',finish);animation.addEventListener('data_failed',finish);timer=setTimeout(finish,1600);
    if(active.size>4)active.values().next().value();
  },{capture:true});
  reduced.addEventListener('change',()=>{for(const finish of [...active])finish()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const finish of [...active])finish()});
})();
