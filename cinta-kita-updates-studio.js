/* Cinta Kita Updates Studio: presentation only, existing Supabase logic remains authoritative. */
(()=>{'use strict';
const panel=document.getElementById('notificationPanel'),list=document.getElementById('notificationList'),head=panel?.querySelector('.notificationPanelHead');
if(!panel||!list||!head||panel.classList.contains('ckup-ready'))return;
panel.classList.add('ckup-ready');
const subtitle=document.createElement('p');subtitle.className='ckup-subtitle';subtitle.textContent='Little changes, lovely new things, and fixes worth knowing.';
head.after(subtitle);
const tools=document.createElement('div');tools.className='ckup-toolbar';
tools.innerHTML='<div class="ckup-toolbar-top"><span class="ckup-count">OUR STORY OF UPDATES</span><span class="ckup-count ckup-total" aria-live="polite"></span></div><input class="ckup-search" type="search" placeholder="Search our updates…" aria-label="Search updates"><div class="ckup-filters" role="group" aria-label="Filter updates"><button type="button" class="ckup-filter" data-filter="all" aria-pressed="true">All updates</button><button type="button" class="ckup-filter" data-filter="videos" aria-pressed="false">Videos</button><button type="button" class="ckup-filter" data-filter="notes" aria-pressed="false">Notes</button></div>';
subtitle.after(tools);
const query=tools.querySelector('.ckup-search'),filters=[...tools.querySelectorAll('.ckup-filter')],count=tools.querySelector('.ckup-total');
let filter='all',pending=false;
function refresh(){
 pending=false;
 const cards=[...list.querySelectorAll('.notificationEntry')];
 const term=query.value.trim().toLocaleLowerCase();
 cards.forEach((card,index)=>{
   // Native notification rendering adds a Watch video action only for video updates.
   const video=!![...card.querySelectorAll('button')].find(b=>/watch video/i.test(b.textContent||''));
   const type=video?'videos':'notes';
   const visible=(filter==='all'||filter===type)&&(!term||card.textContent.toLocaleLowerCase().includes(term));
   card.hidden=!visible;card.classList.toggle('ckup-latest',index===0);
 });
 count.textContent=cards.length?cards.length+' posted':'';
 let empty=list.querySelector('.ckup-filter-empty');
 const visible=cards.some(c=>!c.hidden);
 if(cards.length&&!visible){if(!empty){empty=document.createElement('div');empty.className='ckup-filter-empty ckup-empty';empty.textContent='No updates match this search.';list.append(empty)}empty.hidden=false}
 else if(empty)empty.hidden=true;
}
function schedule(){if(pending)return;pending=true;queueMicrotask(refresh)}
filters.forEach(b=>b.onclick=()=>{filter=b.dataset.filter;filters.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));schedule()});
query.addEventListener('input',schedule);
new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&!(n.classList?.contains('ckup-filter-empty')))))schedule()}).observe(list,{childList:true});
schedule();
})();