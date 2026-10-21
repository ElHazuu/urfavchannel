/* Optional autumn decorations: Oct 1–31 local date, off automatically after the event. */
(()=>{'use strict';if(document.getElementById('ck-hw-switch'))return;
const now=new Date(),inSeason=now.getMonth()===9&&now.getDate()<=31;
const overrideKey='ck:halloween:2026:enabled';
if(!inSeason)return; // No controls or decorations outside the event window.
let allowed=true;try{allowed=localStorage.getItem(overrideKey)!=='off'}catch(_){}
const root=document.documentElement;
const control=document.createElement('button');control.id='ck-hw-switch';control.type='button';control.setAttribute('aria-label','Toggle Halloween event decorations');
const deco=document.createElement('div');deco.id='ck-hw-decor';deco.setAttribute('aria-hidden','true');
deco.innerHTML='<span class="ck-hw-ghost">👻</span><span class="ck-hw-ghost">👻</span><span class="ck-hw-leaf">🍂</span>';
document.body.append(deco,control);
function render(){root.classList.toggle('ck-halloween',allowed);control.innerHTML='<span class="ck-hw-switch-icon">'+(allowed?'🎃':'🍂')+'</span><span>Halloween '+(allowed?'On':'Off')+'</span>';control.setAttribute('aria-pressed',String(allowed));control.title=allowed?'Turn Halloween decorations off':'Turn Halloween decorations back on'}
control.addEventListener('click',()=>{allowed=!allowed;try{localStorage.setItem(overrideKey,allowed?'on':'off')}catch(_){}render()});render();
})();