// Work links land exactly at the start of the work shell.
// SOFT_WORK_ASSIST_START
(()=>{
 const shell=document.querySelector('.shell'),preference=matchMedia('(prefers-reduced-motion: reduce)');
 const options={range:96,idle:220,duration:420};
 let timer=0,frame=0,armed=false,direction=0,touching=false,lastY=window.scrollY;
 const boundary=()=>window.scrollY+shell.getBoundingClientRect().top;
 function cancel(){clearTimeout(timer);cancelAnimationFrame(frame);timer=frame=0;armed=false;direction=0}
 function settle(){
  timer=0;
  if(!armed||touching||preference.matches||matchMedia("(max-width:760px)").matches||document.hidden)return;
  armed=false;
  const from=window.scrollY,to=boundary(),distance=to-from;
  // Only finish an approach; never pull someone back after they passed the boundary.
  if(Math.abs(distance)<2||Math.abs(distance)>options.range||Math.sign(distance)!==direction)return;
  let started;
  function tick(now){
   if(started===undefined)started=now;
   const progress=Math.min(1,(now-started)/options.duration),ease=1-Math.pow(1-progress,3);
   window.scrollTo({top:from+distance*ease,behavior:'instant'});
   if(progress<1)frame=requestAnimationFrame(tick);else frame=0;
  }
  frame=requestAnimationFrame(tick);
 }
 function waitForStop(){clearTimeout(timer);if(!touching)timer=setTimeout(settle,options.idle)}
 window.addEventListener('wheel',event=>{
  cancel();
  if(event.ctrlKey||event.target.closest?.('.rail-body,.overlay,.lightbox')||preference.matches)return;
  direction=Math.sign(event.deltaY);armed=direction!==0&&Math.sign(boundary()-window.scrollY)===direction;
  lastY=window.scrollY;if(armed)waitForStop();
 },{passive:true});
 window.addEventListener('touchstart',event=>{cancel();touching=true;lastY=window.scrollY;armed=!preference.matches&&!event.target.closest?.('.rail-body,.overlay,.lightbox')},{passive:true});
 window.addEventListener('scroll',()=>{
  const y=window.scrollY;
  if(frame){lastY=y;return}
  if(armed){if(!direction&&Math.abs(y-lastY)>.5)direction=Math.sign(y-lastY);waitForStop()}
  lastY=y;
 },{passive:true});
 const endTouch=()=>{touching=false;if(armed)waitForStop()};
 window.addEventListener('touchend',endTouch,{passive:true});window.addEventListener('touchcancel',()=>{touching=false;cancel()},{passive:true});
 window.addEventListener('pointerdown',cancel,{passive:true});window.addEventListener('keydown',cancel);window.addEventListener('click',cancel,true);window.addEventListener('resize',cancel);window.addEventListener('pagehide',cancel);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel()});preference.addEventListener('change',cancel);
})();
// SOFT_WORK_ASSIST_END
// SECTION_NAVIGATION_START
function navigateToSection(hash){
 const target=hash==='#work'?document.querySelector('.shell'):document.getElementById(hash.slice(1));
 if(!target)return false;
 const margin=hash==='#work'?0:(parseFloat(getComputedStyle(target).scrollMarginTop)||0);
 const maximum=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
 const top=Math.max(0,Math.min(maximum,window.scrollY+target.getBoundingClientRect().top-margin));
 if(location.hash!==hash)history.pushState(null,'',hash);
 closeMenu();
 // Focus the selected content without allowing focus to scroll a nested sidebar.
 if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1');
 target.focus({preventScroll:true});
 window.scrollTo({top,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 return true;
}
document.addEventListener('click',event=>{
 if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
 const link=event.target.closest?.('a[href^="#"]');
 if(!link||link.hasAttribute('download')||link.target==='_blank')return;
 const hash=link.getAttribute('href');
 if(!document.getElementById(hash.slice(1)))return;
 event.preventDefault();navigateToSection(hash);
});
// SECTION_NAVIGATION_END
