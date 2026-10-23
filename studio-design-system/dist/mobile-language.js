(()=>{
const list=document.querySelector('.topline .languages');if(!list)return;
const wrapper=document.createElement('div');wrapper.className='mobile-language-control';list.before(wrapper);wrapper.append(list);list.id='mobileLanguageOptions';
const trigger=document.createElement('button');trigger.className='mobile-language-toggle';trigger.type='button';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',list.id);trigger.setAttribute('aria-label','เลือกภาษา');wrapper.prepend(trigger);
const labels={th:'TH',en:'EN',ja:'JP',zh:'CN'};
function sync(){const current=list.querySelector('.selected');let caption=trigger.querySelector('[data-language-label]');if(!caption){trigger.innerHTML='<span data-language-label></span>'+"<span class=\"lucide-icon\" data-lucide=\"chevron-down\" aria-hidden=\"true\"><svg fill=\"none\" height=\"24\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" viewBox=\"0 0 24 24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"m6 9 6 6 6-6\"></path></svg></span>";caption=trigger.querySelector('[data-language-label]')}caption.textContent=labels[current?.dataset.lang||'th']}
function close(){wrapper.classList.remove('language-open');trigger.setAttribute('aria-expanded','false')}
trigger.onclick=()=>{const opening=!wrapper.classList.contains('language-open');document.getElementById('menu').classList.remove('open');document.getElementById('menuToggle').setAttribute('aria-expanded','false');wrapper.classList.toggle('language-open',opening);trigger.setAttribute('aria-expanded',String(opening))};
list.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{sync();close();if(matchMedia('(max-width:760px)').matches)trigger.focus()}));
document.addEventListener('click',e=>{if(!wrapper.contains(e.target))close()});document.addEventListener('focusin',e=>{if(!wrapper.contains(e.target))close()});wrapper.addEventListener('keydown',e=>{if(e.key==='Escape'){close();trigger.focus()}});matchMedia('(max-width:760px)').addEventListener('change',close);sync();
})();
