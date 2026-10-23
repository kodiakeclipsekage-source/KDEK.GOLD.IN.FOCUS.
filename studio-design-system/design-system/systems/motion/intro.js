// Reveal text after assets are ready, preserving its final layout throughout typing.
function startIntroMotion(){
 const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
 if(motionPreference.matches)return;
 document.documentElement.classList.add('motion-ready');
 const reveals=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-revealed');reveals.unobserve(entry.target)}}),{threshold:.15});
 document.querySelectorAll('.fade-up').forEach(el=>reveals.observe(el));
 const finishers=[];
 const typing=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(!entry.isIntersecting)return;
  const target=entry.target;typing.unobserve(target);target.startTyping();
 }),{threshold:.15});
 document.querySelectorAll('[data-typing]').forEach(target=>{
  const original=target.innerHTML;
  target.setAttribute('aria-label',target.innerHTML.replace(/<br\s*\/?\s*>/gi,' ').replace(/<[^>]+>/g,''));
  const layout=document.createElement('span');layout.className='typing-layout';layout.setAttribute('aria-hidden','true');layout.innerHTML=original;
  const ink=document.createElement('span');ink.className='typing-ink';ink.setAttribute('aria-hidden','true');ink.innerHTML=original;
  const walker=document.createTreeWalker(ink,NodeFilter.SHOW_TEXT),parts=[];let node;
  while(node=walker.nextNode()){parts.push({node,text:node.textContent});node.textContent=''}
  target.replaceChildren(layout,ink);target.classList.add('is-typing');
  const total=parts.reduce((n,p)=>n+Array.from(p.text).length,0);let frame=0,finished=false;
  const finish=()=>{if(finished)return;finished=true;cancelAnimationFrame(frame);target.innerHTML=original;target.classList.remove('is-typing')};finishers.push(finish);
  target.startTyping=()=>{let start;
   function tick(now){if(finished)return;if(start===undefined)start=now;let count=Math.min(total,Math.floor((now-start)/45));for(const part of parts){const chars=Array.from(part.text);part.node.textContent=chars.slice(0,Math.max(0,count)).join('');count-=chars.length}if(now-start>=total*45)finish();else frame=requestAnimationFrame(tick)}
   frame=requestAnimationFrame(tick);
  };
  typing.observe(target);
 });
 motionPreference.addEventListener('change',event=>{if(event.matches){finishers.forEach(finish=>finish());typing.disconnect();reveals.disconnect();document.documentElement.classList.remove('motion-ready')}});
}
window.kodiakReady.then(startIntroMotion);

const homeSection=document.getElementById('home'),topLogo=document.querySelector('.home-brand');
let entryFrame=0;
function updateWorkEntry(){
 entryFrame=0;
 const end=homeSection.offsetHeight,distance=Math.min(180,end*.25);
 const progress=Math.max(0,Math.min(1,(window.scrollY-(end-distance))/distance));
 document.documentElement.style.setProperty('--work-entry',progress.toFixed(4));
 const dock=document.querySelector('.home-logo-dock'),slot=document.querySelector('[data-logo-slot]').getBoundingClientRect();
 const shellTop=document.querySelector('.shell').getBoundingClientRect().top;
 const docked=shellTop<=1;
 document.documentElement.style.setProperty('--logo-slot-x',slot.left+'px');
 document.documentElement.style.setProperty('--logo-slot-y',slot.top+'px');
 document.documentElement.style.setProperty('--logo-slot-width',slot.width+'px');
 document.body.classList.toggle('work-entered',docked);
 document.getElementById('backToTop').tabIndex=docked?0:-1;
 document.body.classList.toggle('hero-scrolled',window.scrollY>12);
 const offscreen=!matchMedia("(max-width:760px)").matches&&docked&&slot.bottom<=0;
 document.body.classList.toggle('logo-offscreen',offscreen);
 topLogo.setAttribute('aria-hidden',String(offscreen));topLogo.tabIndex=offscreen?-1:0;dock.setAttribute('aria-hidden',String(offscreen));
}
function scheduleWorkEntry(){if(!entryFrame)entryFrame=requestAnimationFrame(updateWorkEntry)}
window.addEventListener('scroll',scheduleWorkEntry,{passive:true});window.addEventListener('resize',scheduleWorkEntry);window.addEventListener('pageshow',scheduleWorkEntry);updateWorkEntry();
const navs=[...document.querySelectorAll('.railnav a')];
function updateActiveNav(){let current='home';for(const id of ['work','about','contact']){if(document.getElementById(id).getBoundingClientRect().top<=innerHeight*.35)current=id}navs.forEach(a=>a.classList.toggle('active',a.hash==='#'+current))}
window.addEventListener('scroll',updateActiveNav,{passive:true});window.addEventListener('resize',updateActiveNav);updateActiveNav();
