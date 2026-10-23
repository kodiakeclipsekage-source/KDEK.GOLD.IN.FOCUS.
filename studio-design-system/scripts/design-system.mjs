import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
export function configuration(){return {brand:json('design-system/brand.json'),colors:json('design-system/tokens/colors.json'),type:json('design-system/tokens/typography.json'),layout:json('design-system/tokens/layout.json'),motion:json('design-system/tokens/motion.json')};}
export function escapeHTML(value){return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');}
const family=name=>name==='sans-serif'?'sans-serif':JSON.stringify(name);
const stack=font=>[font.family,...font.fallbacks].map(family).join(',');
export function typeDescription(config,lang='th'){
 const {display:d,th,ja,zh,thaiFallback:f}=config.type;
 const names=[d.name,`${th.name} ${th.weight}`,f.family,ja.name,zh.name];
 const text={
  th:`หัวข้ออังกฤษใช้ ${names[0]} ภาษาไทยใช้ ${names[1]} (สำรอง ${names[2]}) ภาษาญี่ปุ่นใช้ ${names[3]} และภาษาจีนใช้ ${names[4]}`,
  en:`English headings use ${names[0]}. Thai uses ${names[1]} with ${names[2]} as a fallback; Japanese uses ${names[3]} and Chinese uses ${names[4]}.`,
  ja:`英語見出しに ${names[0]}、タイ語に ${names[1]}（${names[2]} を補助）、日本語に ${names[3]}、中国語に ${names[4]} を使用。`,
  zh:`英文标题使用 ${names[0]}，泰文使用 ${names[1]}（备用 ${names[2]}），日文使用 ${names[3]}，中文使用 ${names[4]}。`
 };return text[lang]||text.en;
}
export function fontSamples(config,guide=false){
 return '<div class="study-fonts">'+['display','th','ja','zh'].map(id=>{
  const f=config.type[id],cls={display:'font-en',th:'font-th',ja:'font-jp',zh:'font-cn'}[id];
  const sample=id==='display'?f.name:id==='th'?`กนก ${f.name} ${f.weight}`:id==='ja'?`あ ${f.name}`:`字 ${f.name}`;
  return `<span class="${cls}" lang="${id==='display'?'en':id}">${escapeHTML(sample)}${guide?'<i>'+escapeHTML(id==='display'?'English display':id==='th'?'ภาษาไทย · สำรอง '+f.fallbacks[0]:id==='ja'?'日本語':'中文')+'</i>':''}<small>${f.code} / ${f.role}${id==='ja'||id==='zh'?' · '+f.weight:''}</small></span>`;
 }).join('')+'</div>';
}
export function colorSamples(config,guide=false){return '<div class="brand-palette">'+['background','light','brand','action'].map(id=>{const c=config.colors[id];return `<div><i style="background:var(--studio-color-${id})"></i><span>${escapeHTML(c.label)}<br><b>${escapeHTML(c.value.toUpperCase())}</b>${guide?'<small>'+escapeHTML(c.role)+'</small>':''}</span></div>`;}).join('')+'</div>';}
export function tokensCSS(c){
 const {layout:l,type:t,motion:m}=c;
 const declarations=[...Object.entries(c.colors).map(([k,v])=>`--studio-color-${k}:${v.value}`),
  `--studio-font-display:${stack(t.display)}`,`--studio-font-th:${stack(t.th)}`,`--studio-font-ja:${stack(t.ja)}`,`--studio-font-zh:${stack(t.zh)}`,`--studio-font-content:var(--studio-font-th)`,`--studio-content-weight:${t.th.weight}`,`--studio-display-weight:${t.display.weight}`,`--studio-jp-weight:${t.ja.weight}`,`--studio-cn-weight:${t.zh.weight}`,
  `--studio-logo-width:${l.logo.desktop.width}`,`--studio-logo-height:${l.logo.desktop.height}`,`--studio-header-height:${l.logo.desktop.headerHeight}`,
  `--studio-logo-mobile-width:${l.logo.mobile.width}`,`--studio-logo-mobile-height:${l.logo.mobile.height}`,`--studio-header-mobile-height:${l.logo.mobile.headerHeight}`,
  ...Object.entries(l.spacing).map(([k,v])=>`--studio-space-${k}:${v}`),`--studio-radius:${l.radius}`,`--studio-control-size:${l.minimumControlSize}`,
  `--studio-shutter-close:${m.shutterCloseMs}ms`,`--studio-shutter-open:${m.shutterOpenMs}ms`,`--studio-content-reveal:${m.contentRevealMs}ms`,`--studio-loader-mascot:${m.loaderMascotMs}ms`];
 return '/* Generated from design-system/tokens. Run npm run build after editing source. */\n:root{'+declarations.join(';')+'}\nhtml:lang(ja){--studio-font-content:var(--studio-font-ja)}\nhtml:lang(zh){--studio-font-content:var(--studio-font-zh)}\n';
}
export function typographyCSS(c){
 const {display:d,th,ja,zh}=c.type;
 return '/* Shared, swap-based typography. International fonts are linked only on pages that need them. */\n'+
 [400,d.weight].filter((x,i,a)=>a.indexOf(x)===i).map(weight=>`@font-face{font-family:${family(d.family)};font-style:normal;font-weight:${weight};font-display:swap;src:url('${d.file}') format('woff');unicode-range:U+0000-024F}`).join('\n')+'\n'+
 th.localWeights.map(weight=>`@font-face{font-family:${family(th.family)};font-style:normal;font-weight:${weight};font-display:swap;src:url('${th.filePattern.replace('{weight}',weight)}') format('woff')}`).join('\n')+
 '\n.font-en{font-family:var(--studio-font-display);font-weight:var(--studio-display-weight)}.font-th{font-family:var(--studio-font-th);font-weight:var(--studio-content-weight)}.font-jp{font-family:var(--studio-font-ja);font-weight:var(--studio-jp-weight)}.font-cn{font-family:var(--studio-font-zh);font-weight:var(--studio-cn-weight)}\n';
}
export function internationalFonts(c){return '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?'+[c.type.thaiFallback,c.type.ja,c.type.zh].map(f=>'family='+f.googleFamily).join('&amp;')+'&amp;display=swap">';}
// Translate existing declarations to the shared tokens while preserving their values and order.
export function tokenizeCSS(css,c){
 const legacyColors={background:'#111111',light:'#F5F5F5',brand:'#E91632',action:'#EF1632',editorial:'#0b0b0b',surface:'#171717',editorialText:'#f1f0eb',muted:'#969692',line:'#ffffff24'};
 const colors=new Map(Object.entries(legacyColors).map(([key,value])=>[value.toLowerCase(),`var(--studio-color-${key},${value})`]));
 // Short #111 is the same main background; alpha colors and project palettes stay untouched.
 colors.set('#111',`var(--studio-color-background,${c.colors.background.value})`);
 css=css.replace(/#[\da-fA-F]{3,8}\b/g,value=>colors.get(value.toLowerCase())||value);
 const stacks=[[/Bold,Kanit,'Noto Sans Thai','Noto Sans JP','Noto Sans SC',sans-serif/g,'var(--studio-font-display)'],[/Bold,Kanit,sans-serif/g,'var(--studio-font-display)'],[/Bold,Arial,sans-serif/g,'var(--studio-font-display)'],[/Bold,sans-serif/g,'var(--studio-font-display)'],[/Kanit,'Noto Sans Thai',sans-serif/g,'var(--studio-font-content)'],[/Kanit,Arial,sans-serif/g,'var(--studio-font-content)'],[/Kanit,sans-serif/g,'var(--studio-font-content)']];
 for(const [pattern,replacement] of stacks)css=css.replace(pattern,replacement);
 css=css.replace(/font-family:Kanit(?=[;}])/g,'font-family:var(--studio-font-content)').replace(/font-family:'Noto Sans JP',sans-serif/g,'font-family:var(--studio-font-ja)').replace(/font-family:'Noto Sans SC',sans-serif/g,'font-family:var(--studio-font-zh)');
 css=css.replace(/max-width:760px/g,`max-width:${c.layout.mobileBreakpoint}px`).replace(/min-width:761px/g,`min-width:${c.layout.mobileBreakpoint+1}px`);
 css=css.replace(/font:600([^;{}]*?var\(--studio-font-content\))/g,'font:var(--studio-content-weight,600)$1').replace(/font:600([^;{}]*?var\(--studio-font-display\))/g,'font:var(--studio-display-weight,600)$1');
 css=css.replace(/(min-height|min-width|height|width):44px(?=[;}])/g,'$1:var(--studio-control-size,44px)').replace(/border-radius:4px(?=[;}])/g,'border-radius:var(--studio-radius,4px)').replace(/gap:12px(?=[;}])/g,'gap:var(--studio-space-grid,12px)');
 return css;
}
export function render(text,c=configuration(),ancestors=[]){
 const resolved=text.replace(/\{\{([a-z-]+):([^}]+)\}\}/g,(match,kind,arg)=>{
  if(kind==='include'){
   if(ancestors.includes(arg))throw Error('Circular include: '+[...ancestors,arg].join(' -> '));
   const absolute=path.resolve(root,arg);if(!absolute.startsWith(root+path.sep))throw Error('Source include is outside project');
   return render(read(arg),c,[...ancestors,arg]);
  }
  if(kind==='json')return JSON.stringify(json(arg)).replaceAll('<','\\u003c');
  if(kind==='brand-json'){if(!(arg in c.brand))throw Error('Unknown brand setting '+arg);return JSON.stringify(c.brand[arg]).replaceAll('<','\\u003c');}
  if(kind==='brand'){if(!(arg in c.brand))throw Error('Unknown brand setting '+arg);return escapeHTML(c.brand[arg]);}
  if(kind==='motion'){if(!(arg in c.motion))throw Error('Unknown motion setting '+arg);return c.motion[arg];}
  if(kind==='type-copy')return JSON.stringify({typeStudyDesc:typeDescription(c,arg),colourStudyDesc:{th:'สีหลักของเว็บคือดำเข้มและขาวนวล ใช้แดงเป็นจุดเน้นบนโลโก้ เมนู และปุ่มที่ต้องการให้เห็นชัด',en:'Deep black and soft white form the main palette. Red draws attention to the logo, navigation and key actions.',ja:'深い黒と柔らかな白を基本色とし、赤をロゴ、メニュー、重要な操作に使います。',zh:'深黑与柔白构成主色，红色用于标志、菜单和关键操作。'}[arg]});
  if(kind==='design')switch(arg){
   case 'head':return '<link rel="stylesheet" href="/studio-tokens.css"><link rel="stylesheet" href="/studio-typography.css">';
   case 'international-fonts':return internationalFonts(c);
   case 'font-samples':return fontSamples(c);
   case 'guide-font-samples':return fontSamples(c,true);
   case 'colour-samples':return colorSamples(c);
   case 'guide-colour-samples':return colorSamples(c,true);
   case 'type-description':return escapeHTML(typeDescription(c));
   case 'guide-studios':return studioCards(c);
   case 'starter-topbar':return render(read('design-system/components/topbar/topbar.html'),c).replace(/<a[^>]*data-resume-link[^>]*>[\s\S]*?<\/a>/,'');
  }
  throw Error('Unknown design-system directive '+match);
 });
 return c.layout.mobileBreakpoint===760?resolved:resolved.replace(/max-width:\s*760px/g,`max-width:${c.layout.mobileBreakpoint}px`).replace(/min-width:\s*761px/g,`min-width:${c.layout.mobileBreakpoint+1}px`);
}
function studioCards(){
 // The source registry remains the sole authoring point for studio names and assets.
 const source=read('design-system/components/logo/studios.js');
 return ['kdek','kawaii','kohaneko'].map(id=>{
  const record=source.match(new RegExp(id+": \\{name: '([^']+)', logo: '([^']+)'"));if(!record)throw Error('Studio '+id+' is missing');
  return `<div class="guide-studio"><div><img data-studio-logo="${id}" src="${escapeHTML(record[2])}" alt="${escapeHTML(record[1])} logo" loading="lazy"></div><span data-studio-name="${id}">${escapeHTML(record[1])}</span></div>`;
 }).join('');
}
function htmlOutput(text,c){return render(text,c).replace(/<style>([\s\S]*?)<\/style>/g,(_,css)=>'<style>'+tokenizeCSS(css,c)+'</style>');}
export function outputs(c=configuration()){
 const output=new Map([['studio-tokens.css',tokensCSS(c)],['studio-typography.css',typographyCSS(c)]]);
 const manifest=json('design-system/build-manifest.json');
 for(const [destination,source] of Object.entries(manifest.files)){
  let text=render(read(source),c);
  if(destination.endsWith('.css'))text=tokenizeCSS(text,c);
  output.set(destination,text);
 }
 function pages(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())pages(p);else if(entry.name.endsWith('.html'))output.set(path.relative(path.join(root,'src/pages'),p),htmlOutput(fs.readFileSync(p,'utf8'),c));}}
 pages(path.join(root,'src/pages'));
 // The old snapshot path stays compatible but is now generated from the active config.
 output.set('media-config.json',JSON.stringify(json('src/pages/home/projects.json'),null,2)+'\n');
 return output;
}
export function writeOutputs(directory=path.join(root,'dist'),c=configuration()){
 const generated=outputs(c);for(const [relative,content] of generated){const target=path.join(directory,relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,content);}return generated;
}
