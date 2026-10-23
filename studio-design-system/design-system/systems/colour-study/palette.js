(() => {
  const swatches = document.querySelector('[data-auto-palette]');
  const story = document.querySelector('.story');
  if (!swatches || !story) return;
  const note = document.querySelector('[data-palette-status]');
  const labels = ['DOMINANT','SECONDARY','ACCENT'];
  let requested = false, generation = 0, currentKey = '', queued = false;
  const distance = (a,b) => (2*(a.r-b.r)**2 + 4*(a.g-b.g)**2 + 3*(a.b-b.b)**2)/9;

  function colours(pixels) {
    const bins = new Map();
    for (let i=0;i<pixels.length;i+=4) {
      if (pixels[i+3] < 128) continue;
      const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
      const key=(r>>3)*1024+(g>>3)*32+(b>>3);
      let bin=bins.get(key);
      if (!bin) {bin={r:0,g:0,b:0,n:0};bins.set(key,bin);}
      bin.r+=r;bin.g+=g;bin.b+=b;bin.n++;
    }
    const points=[...bins.values()].map(p=>({r:p.r/p.n,g:p.g/p.n,b:p.b/p.n,n:p.n})).sort((a,b)=>b.n-a.n);
    if (!points.length) return [];
    let centres=[{...points[0]}];
    while (centres.length<Math.min(6,points.length)) {
      let best,score=0;
      for (const p of points) {
        const value=Math.min(...centres.map(c=>distance(p,c)))*Math.sqrt(p.n);
        if (value>score) {best=p;score=value;}
      }
      if (!best || score<1) break;
      centres.push({...best});
    }
    for (let iteration=0;iteration<8;iteration++) {
      const sums=centres.map(()=>({r:0,g:0,b:0,n:0}));
      for (const p of points) {
        let nearest=0;
        for (let i=1;i<centres.length;i++) if (distance(p,centres[i])<distance(p,centres[nearest])) nearest=i;
        const sum=sums[nearest];sum.r+=p.r*p.n;sum.g+=p.g*p.n;sum.b+=p.b*p.n;sum.n+=p.n;
      }
      centres=sums.filter(p=>p.n).map(p=>({r:p.r/p.n,g:p.g/p.n,b:p.b/p.n,n:p.n}));
    }
    centres.sort((a,b)=>b.n-a.n);
    const chosen=[centres.shift()];
    while (chosen.length<3 && centres.length) {
      let best=-1,score=0;
      for (let i=0;i<centres.length;i++) {
        const separation=Math.min(...chosen.map(c=>distance(c,centres[i])));
        const value=separation*Math.sqrt(centres[i].n);
        if (separation>=24**2 && value>score) {best=i;score=value;}
      }
      if (best<0) break;
      chosen.push(centres.splice(best,1)[0]);
    }
    return [...new Set(chosen.map(p=>'#'+[p.r,p.g,p.b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase()))];
  }

  function media() {
    return document.querySelector('#overview img,#overview video') || document.querySelector('.hero img,.hero video');
  }
  function identity(element) {
    return element ? [element.tagName,element.getAttribute('data-src')||element.getAttribute('src')||'',element.getAttribute('poster')||'',element.getAttribute('srcset')||''].join('|') : '';
  }
  function loadImage(source) {
    return new Promise((resolve,reject) => {
      const image = new Image();
      if (new URL(source,location.href).origin !== location.origin) image.crossOrigin='anonymous';
      const clean = () => {clearTimeout(timer);image.onload=image.onerror=null;};
      const timer = setTimeout(()=>{clean();reject(Error('Image timeout'));},6000);
      image.onload=()=>{clean();resolve(image);};
      image.onerror=()=>{clean();reject(Error('Image unavailable'));};
      image.src=source;
    });
  }
  function render(palette) {
    const fragment = document.createDocumentFragment();
    palette.forEach((hex,index) => {
      const item=document.createElement('div'),chip=document.createElement('i'),caption=document.createElement('span'),code=document.createElement('b');
      chip.style.backgroundColor=hex;chip.setAttribute('aria-hidden','true');
      code.textContent=hex;caption.append(labels[index],code);item.append(chip,caption);fragment.append(item);
    });
    swatches.replaceChildren(fragment);
    swatches.dataset.paletteState='ready';
    note.textContent='สีจากภาพรวม / Colours from Overview';
  }
  async function extract(force=false) {
    const element=media(),key=identity(element);
    if (!requested || !key || (!force && currentKey===key)) return;
    currentKey=key;
    const ticket=++generation;
    swatches.setAttribute('aria-busy','true');
    swatches.dataset.paletteState='loading';
    note.textContent='กำลังอ่านสีจาก Overview…';
    const placeholders=document.createDocumentFragment();
    for (let i=0;i<3;i++) {
      const item=document.createElement('div');item.className='palette-placeholder';item.setAttribute('aria-hidden','true');item.append(document.createElement('i'));placeholders.append(item);
    }
    swatches.replaceChildren(placeholders);
    try {
      let source;
      if (element.tagName==='VIDEO') {
        const poster=element.getAttribute('poster');
        if (poster) source=await loadImage(poster);
        else if (element.readyState>=2) source=element;
        else {currentKey='';return;}
      } else source=await loadImage(element.currentSrc||element.getAttribute('src'));
      if (ticket!==generation || key!==identity(media())) return;
      const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
      const context=canvas.getContext('2d',{willReadFrequently:true});
      if (!context) throw Error('Canvas unavailable');
      context.drawImage(source,0,0,64,64);
      const palette=colours(context.getImageData(0,0,64,64).data);
      if (!palette.length) throw Error('No opaque colours');
      render(palette);
    } catch {
      if (ticket!==generation) return;
      swatches.dataset.paletteState='unavailable';
      note.textContent='ยังอ่านสีจากภาพนี้ไม่ได้';
    } finally {
      if (ticket===generation) swatches.setAttribute('aria-busy','false');
    }
  }
  function schedule() {
    if (!requested || queued) return;
    queued=true;
    const run=()=>{queued=false;extract();};
    if (window.requestIdleCallback) requestIdleCallback(run,{timeout:800});else setTimeout(run,16);
  }
  const start=()=>{
    if ('IntersectionObserver' in window) {
      const observer=new IntersectionObserver(entries=>{
        if (entries.some(entry=>entry.isIntersecting)) {requested=true;schedule();observer.disconnect();}
      },{rootMargin:'400px 0px'});
      observer.observe(swatches);
    } else {requested=true;schedule();}
  };
  new MutationObserver(()=>{
    if (identity(media())!==currentKey) schedule();
  }).observe(story,{subtree:true,childList:true,attributes:true,attributeFilter:['src','data-src','poster','srcset']});
  story.addEventListener('loadeddata',event=>{if(event.target===media())schedule();},true);
  story.addEventListener('load',event=>{if(event.target===media())schedule();},true);
  if (window.kodiakReady) window.kodiakReady.then(start);else start();
})();
