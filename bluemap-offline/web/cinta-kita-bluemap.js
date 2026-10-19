/* Cinta Kita extra BlueMap behavior. Avoids overriding native controls. */
(() => {
 'use strict';
 if (window.__cintaKitaBlueMap) return;
 window.__cintaKitaBlueMap = true;
 const root=document.documentElement;
 // Map theme sync from its parent Cinta Kita wrapper (when same origin).
 // No claims of exact biome detection: the parent may only have estimated colors.
 function syncParentTheme(){
   try{
     if(window.parent===window)return;
     const s=window.parent.getComputedStyle(window.parent.document.documentElement);
     const accent=s.getPropertyValue('--pink').trim();
     const glass=s.getPropertyValue('--glass').trim();
     const line=s.getPropertyValue('--line').trim();
     if(accent && /^#[0-9a-f]{3,8}$/i.test(accent)){
       root.style.setProperty('--ck-accent',accent);
       root.style.setProperty('--theme-accent',accent);
     }
     if(glass && (/^#[0-9a-f]{3,8}$/i.test(glass)||/^rgba?\(/i.test(glass)))root.style.setProperty('--ck-surface',glass);
     if(line && /^#[0-9a-f]{3,8}$/i.test(line))root.style.setProperty('--ck-stroke',line);
   }catch(_){/* Fall back to Cinta Kita pink. */}
 }
 syncParentTheme();setInterval(syncParentTheme,2200);
 // Tiny confirmation for browser DevTools: `window.__cintaKitaBlueMap === true`.
 console.info('[Cinta Kita] BlueMap custom UI theme loaded');
})();


/* Cinta Kita Memories — Step 2: test terrain position capture only.
   No network writes or markers are created in this test. */
(() => {
 'use strict';
 if (window.__ckMemoryPositionTest) return;
 window.__ckMemoryPositionTest = true;
 const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, {once:true}) : fn();
 ready(() => {
  const style = document.createElement('style');
  style.textContent = `
   #ck-add-memory,#ck-placement-hint{position:fixed;right:16px;z-index:2147481000;color:var(--ck-accent,#ffd1e5);font:600 13px system-ui,sans-serif;border:1px solid var(--ck-stroke,#eeb8d077);border-radius:13px;background:var(--ck-surface,#291d2de8);box-shadow:0 9px 24px #0007}
   #ck-add-memory{bottom:74px;display:flex;gap:8px;align-items:center;padding:11px 15px;cursor:pointer;transition:transform .18s,box-shadow .18s}
   #ck-add-memory:hover{transform:scale(1.06);box-shadow:0 12px 28px #0009,0 0 15px var(--ck-accent,#ffc4e088)}
   #ck-placement-hint{bottom:129px;max-width:min(330px,calc(100vw - 32px));padding:12px 14px;display:none;line-height:1.5}
   #ck-add-memory.ck-placing{outline:2px solid var(--ck-accent,#ffd1e5)}
   #ck-memory-shade{position:fixed;inset:0;z-index:2147482000;background:#08070bb5;display:flex;align-items:center;justify-content:center;padding:15px}
   #ck-memory-dialog{width:min(420px,100%);max-height:90vh;overflow:auto;border:1px solid var(--ck-stroke,#eeb8d077);border-radius:20px;background:var(--ck-surface,#261a2bef);color:#fff5fa;padding:23px;box-shadow:0 22px 70px #000b;font:14px system-ui,sans-serif}
   #ck-memory-dialog h2{margin:0 0 8px;color:var(--ck-accent,#ffc4da);font-size:22px}
   #ck-memory-dialog p{line-height:1.5;color:#e3d5dc}
   #ck-memory-dialog button{border:1px solid #c69fb17c;border-radius:9px;padding:9px 13px;background:#4c344b;color:white;cursor:pointer}
   #ck-memory-dialog .ck-actions{display:flex;gap:9px;justify-content:flex-end;margin-top:18px}
  `;
  document.head.append(style);
  const button=document.createElement('button');button.id='ck-add-memory';button.type='button';
  button.textContent='＋ Add Memory';button.title='Test choosing a block location';document.body.append(button);
  const hint=document.createElement('div');hint.id='ck-placement-hint';hint.setAttribute('role','status');document.body.append(hint);
  let active=false, observer=null, timer=null, clickTime=0, lastPosition=null;
  const coordsPattern=/\bx\s*[:=]\s*(-?\d+)\s*[,;\s]+\by\s*[:=]\s*(-?\d+)\s*[,;\s]+\bz\s*[:=]\s*(-?\d+)\b/i;
  const ignore=el=>!!el.closest('#ck-placement-hint,#ck-add-memory,#ck-memory-shade');
  function findPosition(){
   // BlueMap's clicked-block popup is a small DOM element. Only scan
   // short leaf/near-leaf elements to avoid matching unrelated page content.
   const nodes=document.querySelectorAll('div,span,p');
   for(const el of nodes){
    if(ignore(el)||el.children.length>5)continue;
    const t=(el.textContent||'').trim();
    if(t.length<11||t.length>140)continue;
    if(!/\bblock\s*:/i.test(t))continue;
    const m=t.match(coordsPattern);
    if(m)return {x:Number(m[1]),y:Number(m[2]),z:Number(m[3])};
   }
   return null;
  }
  function stop(){
   active=false;button.classList.remove('ck-placing');button.textContent='＋ Add Memory';
   hint.style.display='none';
   if(observer){observer.disconnect();observer=null}
   if(timer){clearTimeout(timer);timer=null}
  }
  function showResult(pos){
   stop();lastPosition=pos;
   const shade=document.createElement('div');shade.id='ck-memory-shade';
   const dialog=document.createElement('section');dialog.id='ck-memory-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
   const dimension=decodeURIComponent((location.hash.slice(1).split(':')[0]||'Unknown dimension'));
   const h=document.createElement('h2');h.textContent='Memory position found ♡';dialog.append(h);
   const body=document.createElement('p');body.textContent=`X: ${pos.x} · Y: ${pos.y} · Z: ${pos.z} · ${dimension}`;dialog.append(body);
   const msg=document.createElement('p');msg.textContent='This confirms we can read BlueMap’s clicked block. Nothing has been saved or placed yet; next we will connect real world-anchored markers and member permissions.';dialog.append(msg);
   const actions=document.createElement('div');actions.className='ck-actions';
   const closeBtn=document.createElement('button');closeBtn.type='button';closeBtn.textContent='Close';actions.append(closeBtn);dialog.append(actions);
   shade.append(dialog);document.body.append(shade);
   function close(){window.removeEventListener('keydown',keyBlock,true);shade.remove();button.focus()}
   function keyBlock(e){if(e.key==='Escape'){e.preventDefault();close();return}e.stopImmediatePropagation()}
   window.addEventListener('keydown',keyBlock,true);
   shade.addEventListener('click',e=>{e.stopPropagation();if(e.target===shade)close()});
   closeBtn.addEventListener('click',close);
  }
  function inspect(){if(!active)return;const p=findPosition();if(p)showResult(p)}
  button.addEventListener('click',()=>{
   if(active){stop();return}
   active=true;lastPosition=null;button.textContent='✕ Cancel placement';button.classList.add('ck-placing');
   hint.textContent='Now click a solid block on the 3D map. We’ll read the clicked-block position. No memory will be saved yet.';hint.style.display='block';
   observer=new MutationObserver(inspect);
   observer.observe(document.body,{subtree:true,childList:true,characterData:true});
   // Observe for the temporary clicked-block tooltip; do not mistake an old one
   // for a new click. The click handler also checks after the viewer updates.
  });
  document.addEventListener('click', e=>{
   if(!active || e.target.closest('#ck-add-memory,#ck-placement-hint,#ck-memory-shade'))return;
   clickTime=Date.now();
   if(timer)clearTimeout(timer);
   timer=setTimeout(()=>{
    if(!active)return;
    inspect();
    if(active){hint.textContent='Could not read that block yet. Try another block. If this persists, we’ll inspect the BlueMap popup structure.'}
   },600);
  },true);
  console.info('[Cinta Kita] Add Memory position test loaded (no saving)');
 });
})();
