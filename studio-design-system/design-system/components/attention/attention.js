(() => {
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const touch=matchMedia('(hover: none)');
  const coarse=matchMedia('(pointer: coarse)');
  const mobile=matchMedia('(max-width: 760px)');
  const automatic=()=>touch.matches||coarse.matches||mobile.matches;
  // Calibrated SVG tip positions after orientation; play only the stable drawing segment.
  const variants=[
    {id:1,start:22,end:64,x:.795,y:.6635,flip:'-1,1',rotate:0},
    {id:2,start:22,end:64,x:.777,y:.6635,flip:'-1,1',rotate:0},
    {id:3,start:59,end:94,x:.994,y:.2165,flip:'1,1',rotate:0},
    {id:4,start:20,end:30,x:.906,y:.441,flip:'-1,-1',rotate:-41},
    {id:6,start:20,end:64,x:.816,y:.663,flip:'-1,1',rotate:0}
  ];
  const cards=[...document.querySelectorAll('.workgrid .project')].filter(card=>card.querySelector('.open'));
  const cache=new Map(),played=new WeakSet(),attempts=new WeakMap();
  const previousCopy=new Map();
  const captions={
    th:{pointer:['คลิกที่นี่','เปิดดูงาน','ดูโปรเจกต์'],touch:['แตะที่นี่','แตะดูงาน','ดูโปรเจกต์']},
    en:{pointer:['CLICK HERE','VIEW PROJECT'],touch:['TAP HERE','VIEW PROJECT']},
    ja:{pointer:['クリック','作品を見る'],touch:['タップ','作品を見る']},
    zh:{pointer:['点击查看','查看作品'],touch:['点击查看','查看作品']}
  };
  let bag=[],last=-1,active=null,hoverTimer,finishTimer,fadeTimer,settleTimer,frame,captionFrame;
  function prepareCaption(state){
    cancelAnimationFrame(captionFrame);
    const language=captions[document.documentElement.lang]?document.documentElement.lang:'th';
    const mode=automatic()?'touch':'pointer',key=language+mode;
    const options=captions[language][mode].filter(text=>text!==previousCopy.get(key));
    const text=options[Math.floor(Math.random()*options.length)];previousCopy.set(key,text);
    const {label,sizer,ink}=state.entry;
    label.hidden=true;label.lang=language;label.dataset.label=text;
    sizer.textContent=text;ink.textContent='';
    state.captionText=text;
  }
  function revealCaption(state){
    const {label,ink}=state.entry,text=state.captionText;
    cancelAnimationFrame(captionFrame);label.hidden=false;position(state);
    if(preference.matches){ink.textContent=text;return}
    // Reserve the complete line, then reveal graphemes at the homepage's typing pace.
    const characters=typeof Intl.Segmenter==='function'
      ?[...new Intl.Segmenter(label.lang,{granularity:'grapheme'}).segment(text)].map(part=>part.segment):Array.from(text);
    let start;
    function tick(now){
      if(active!==state)return;
      if(start===undefined)start=now;
      const count=Math.min(characters.length,Math.max(0,Math.floor((now-start-80)/45)));
      ink.textContent=characters.slice(0,count).join('');
      captionFrame=count<characters.length?requestAnimationFrame(tick):0;
    }
    captionFrame=requestAnimationFrame(tick);
  }
  function choose(){
    if(!bag.length){bag=variants.flatMap((variant,i)=>variant.data?[i]:[]);for(let i=bag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}if(bag.length>1&&bag.at(-1)===last)[bag[0],bag[bag.length-1]]=[bag.at(-1),bag[0]]}
    if(!bag.length)return null;
    last=bag.pop();return variants[last];
  }
  function stop(){
    clearTimeout(hoverTimer);clearTimeout(finishTimer);clearTimeout(fadeTimer);clearTimeout(settleTimer);
    cancelAnimationFrame(captionFrame);captionFrame=0;
    if(active){active.entry.animation.pause();active.entry.layer.remove();active=null}
  }
  function position(state){
    const {art,button,entry}=state;
    // Offset geometry ignores the decorative rotation on the circular open button.
    const size=automatic()?Math.max(80,Math.min(100,art.clientWidth*.24)):Math.max(88,Math.min(146,art.clientWidth*.28));
    const x=button.offsetLeft-10,y=button.offsetTop+button.offsetHeight/2;
    entry.layer.style.width=size+'px';entry.layer.style.height=size+'px';
    const left=x-entry.variant.x*size,top=y-entry.variant.y*size;
    entry.layer.style.left=left+'px';entry.layer.style.top=top+'px';
    entry.layer.dataset.targetX=String(x);entry.layer.dataset.targetY=String(y);
    if(entry.label){
      entry.label.style.maxWidth=Math.max(56,art.clientWidth-24)+'px';
      const width=entry.label.offsetWidth||Math.min(148,art.clientWidth-24),height=entry.label.offsetHeight||26;
      const labelLeft=Math.max(12,Math.min(button.offsetLeft-12-width,art.clientWidth-width-12));
      const labelTop=Math.max(10,button.offsetTop-size*.72-height-6);
      entry.label.style.left=(labelLeft-left)+'px';entry.label.style.top=(labelTop-top)+'px';
      entry.layer.dataset.captionX=String(labelLeft);entry.layer.dataset.captionY=String(labelTop);
    }
  }
  function instance(variant,parent){
    if(cache.has(variant.id)){const entry=cache.get(variant.id);parent.append(entry.layer);return entry}
    const layer=document.createElement('span');layer.className='project-attention';layer.dataset.variant=String(variant.id);layer.setAttribute('aria-hidden','true');
    const art=document.createElement('span');art.className='project-attention-art';layer.append(art);
    const label=document.createElement('span');label.className='project-attention-caption';label.hidden=true;
    const sizer=document.createElement('span');sizer.className='project-attention-caption-sizer';
    const ink=document.createElement('span');ink.className='project-attention-caption-ink';label.append(sizer,ink);layer.append(label);
    art.style.transform='rotate('+variant.rotate+'deg) scale('+variant.flip+')';
    // Mount before Lottie measures its SVG container, including on mobile.
    parent.append(layer);
    position({art:parent,button:parent.querySelector('.open'),entry:{layer,variant,label}});
    const animation=lottie.loadAnimation({container:art,renderer:'svg',loop:false,autoplay:false,initialSegment:[variant.start,variant.end],animationData:JSON.parse(JSON.stringify(variant.data))});
    const entry={layer,animation,variant,label,sizer,ink,ready:false};cache.set(variant.id,entry);
    animation.setSpeed(.8);
    const ready=()=>{if(entry.ready)return;entry.ready=true;if(active?.entry===entry)play(active)};
    animation.addEventListener('DOMLoaded',ready);if(animation.isLoaded)ready();
    animation.addEventListener('data_failed',()=>{if(active?.entry===entry){attempts.delete(active.card);stop()}cache.delete(variant.id);animation.destroy()});
    return entry;
  }
  function play(state){
    if(state.started)return;
    state.started=true;
    const {entry,mode}=state;
    clearTimeout(finishTimer);clearTimeout(fadeTimer);
    entry.layer.classList.remove('is-leaving');
    revealCaption(state);
    entry.animation.resize?.();
    if(preference.matches)entry.animation.goToAndStop(entry.variant.end-entry.variant.start-1,true);
    else{
      entry.animation.setSpeed(mode==='auto'?(entry.variant.end-entry.variant.start)/(entry.variant.data.fr*1.25):.8);
      entry.animation.goToAndPlay(0,true);
    }
    if(mode==='auto')finishTimer=setTimeout(()=>{
      if(active!==state)return;
      entry.layer.classList.add('is-leaving');
      fadeTimer=setTimeout(()=>{if(active===state){played.add(state.card);attempts.delete(state.card);stop()}},250);
    },1600);
  }
  function show(card,mode='hover'){
    if((preference.matches&&!automatic())||document.hidden||window.kodiakScrolling||!window.kodiakAssetsReady||!window.lottie?.loadAnimation)return false;
    if(active?.card===card)return true;
    const variant=mode==='auto'&&attempts.get(card)||choose();if(!variant)return false;
    if(mode==='auto')attempts.set(card,variant);
    stop();const art=card.querySelector('.project-art'),button=card.querySelector('.open'),entry=instance(variant,art);
    active={card,art,button,entry,mode,started:false};prepareCaption(active);position(active);
    entry.layer.dataset.mode=mode;
    if(entry.ready)play(active);
    return true;
  }
  function update(){
    frame=null;
    if(document.hidden||preference.matches&&!automatic())return;
    const height=Math.min(window.innerHeight,window.visualViewport?.height||window.innerHeight);
    if(active){const r=active.art.getBoundingClientRect();if(r.bottom<=76||r.top>=height){stop()}else position(active)}
    if(!automatic()||!window.kodiakAssetsReady||!variants.some(variant=>variant.data)||active&&active.mode!=='auto')return;
    const eligible=cards.map(card=>{
      const art=card.querySelector('.project-art').getBoundingClientRect(),button=card.querySelector('.open').getBoundingClientRect();
      const visible=Math.min(art.bottom,height)-Math.max(art.top,76);
      return {card,art,button,visible,distance:Math.abs((Math.max(art.top,76)+Math.min(art.bottom,height))/2-height/2)};
    }).filter(item=>item.visible>=Math.min(100,item.art.height*.25)&&item.button.top>=82&&item.button.bottom<=height-6).sort((a,b)=>a.distance-b.distance);
    const winner=eligible[0]?.card;
    if(active?.mode==='auto'&&active.card!==winner)stop();
    if(winner&&!played.has(winner))show(winner,'auto');
  }
  function schedule(){
    if(automatic()){
      clearTimeout(settleTimer);
      // Resize and asset readiness must not cancel a hint that has just started.
      if(active)position(active);
      if(!document.hidden)settleTimer=setTimeout(update,400);
    }else if(!frame)frame=requestAnimationFrame(update);
  }
  function onScroll(){
    if(automatic()&&active?.mode==='auto')stop();
    schedule();
  }
  window.kodiakAttentionReady=Promise.allSettled(variants.map(async variant=>{
    const response=await fetch('/animations/kdek.attention'+variant.id+'.json');if(!response.ok)throw Error('attention animation');variant.data=await response.json();
    schedule();
  })).then(schedule);
  window.kodiakAttentionReady.catch(()=>{});
  for(const card of cards){
    let hovered=false,focused=false;
    card.addEventListener('pointerenter',event=>{if(event.pointerType==='touch'||automatic())return;hovered=true;clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{if(hovered)show(card)},120)});
    card.addEventListener('pointerleave',()=>{hovered=false;clearTimeout(hoverTimer);if(!focused&&active?.card===card&&active.mode!=='auto')stop()});
    card.addEventListener('focusin',()=>{focused=true;if(!automatic())show(card,'focus')});
    card.addEventListener('focusout',event=>{if(card.contains(event.relatedTarget))return;focused=false;if(!hovered&&active?.card===card&&active.mode!=='auto')stop()});
    card.addEventListener('click',stop);
  }
  if(window.ResizeObserver){const observer=new ResizeObserver(schedule);for(const card of cards){observer.observe(card.querySelector('.project-art'));observer.observe(card.querySelector('.open'))}}
  if(window.IntersectionObserver){const observer=new IntersectionObserver(schedule,{threshold:[0,.5,1]});cards.forEach(card=>observer.observe(card.querySelector('.open')))}
  window.addEventListener('scroll',onScroll,{passive:true});document.addEventListener('scroll',onScroll,{passive:true,capture:true});window.addEventListener('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener('resize',schedule);
  document.addEventListener('kodiak:assets-ready',schedule);window.kodiakReady?.then(schedule);
  document.addEventListener('kodiak:scroll-state',event=>{if(event.detail.scrolling)stop();else schedule()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else schedule()});
  for(const query of [preference,touch,coarse,mobile])query.addEventListener('change',()=>{stop();schedule()});
  new MutationObserver(()=>{if(active){prepareCaption(active);if(active.started)revealCaption(active)}})
    .observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  window.addEventListener('pagehide',stop);
})();
