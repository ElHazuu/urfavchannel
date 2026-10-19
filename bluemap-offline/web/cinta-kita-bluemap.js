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


/* Cinta Kita Memories — STEP 1: Add Memory toolbar button and draft editor.
   This step intentionally does not claim to create a terrain-anchored marker.
   That requires connecting to BlueMap's coordinate-picking API in Step 2.
*/
(() => {
 'use strict';
 if (window.__ckMemoryStep1) return;
 window.__ckMemoryStep1 = true;
 const ready = fn => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded',fn,{once:true}) : fn();
 ready(() => {
  const css = document.createElement('style');
  css.textContent = `
   #ck-add-memory{position:fixed;right:16px;bottom:74px;z-index:2147481000;display:flex;align-items:center;gap:8px;padding:11px 15px;border:1px solid var(--ck-stroke,#eeb8d077);border-radius:13px;background:var(--ck-surface,#291d2de8);color:var(--ck-accent,#ffd1e5);font:600 13px system-ui,sans-serif;box-shadow:0 9px 24px #0007;cursor:pointer;transition:transform .18s,box-shadow .18s}
   #ck-add-memory:hover,#ck-add-memory:focus-visible{transform:scale(1.06);box-shadow:0 12px 28px #0009,0 0 15px var(--ck-accent,#ffc4e088)}
   #ck-add-memory svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
   #ck-memory-shade{position:fixed;inset:0;z-index:2147482000;background:#08070bb5;display:flex;align-items:center;justify-content:center;padding:15px}
   #ck-memory-dialog{width:min(420px,100%);max-height:90vh;overflow:auto;border:1px solid var(--ck-stroke,#eeb8d077);border-radius:20px;background:var(--ck-surface,#261a2bef);color:#fff5fa;padding:23px;box-shadow:0 22px 70px #000b;font:14px system-ui,sans-serif}
   #ck-memory-dialog h2{margin:0 0 8px;color:var(--ck-accent,#ffc4da);font-size:22px}
   #ck-memory-dialog p{line-height:1.5;color:#e3d5dc}
   #ck-memory-dialog label{display:block;margin-top:13px;font-weight:600;font-size:12px}
   #ck-memory-dialog input,#ck-memory-dialog textarea{margin-top:5px;width:100%;border-radius:9px;border:1px solid #c69fb17c;background:#100e17b8;color:white;padding:10px;font:inherit}
   #ck-memory-dialog .ck-actions{display:flex;gap:9px;justify-content:flex-end;margin-top:18px}
   #ck-memory-dialog button{border:1px solid #c69fb17c;border-radius:9px;padding:9px 13px;background:#4c344b;color:white;cursor:pointer}
   #ck-memory-preview{margin-top:12px;max-width:100%;max-height:155px;object-fit:contain;border-radius:9px}
  `;
  document.head.append(css);
  const button = document.createElement('button');
  button.id='ck-add-memory';button.type='button';button.title='Create a Minecraft memory (draft editor)';
  button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/><path d="M4 7h4l2-2h4l2 2h4v13H4z"/></svg><span>Add Memory</span>';
  document.body.append(button);
  button.addEventListener('click', () => {
   if(document.getElementById('ck-memory-shade'))return;
   const shade=document.createElement('div');shade.id='ck-memory-shade';
   const dialog=document.createElement('section');dialog.id='ck-memory-dialog';dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Create memory draft');
   dialog.innerHTML='<h2>New Minecraft Memory ♡</h2><p>Test your memory editor here. Placement on the actual 3D map and online saving will be added after we verify the toolbar works.</p><label>Title<input id="ck-title" maxlength="100" placeholder="Our first house" /></label><label>Notes<textarea id="ck-notes" rows="3" maxlength="4000" placeholder="Write your memory…"></textarea></label><label>Screenshot<input id="ck-photo" type="file" accept="image/*" /></label><img id="ck-memory-preview" alt="Selected image preview" hidden/><label>YouTube link<input id="ck-video" type="url" placeholder="https://www.youtube.com/watch?v=…" /></label><p id="ck-draft-status" aria-live="polite"></p><div class="ck-actions"><button id="ck-close" type="button">Close</button><button id="ck-test" type="button">Preview details</button></div>';
   shade.append(dialog);document.body.append(shade);
   // Keep keyboard and pointer gestures inside the editor, not BlueMap.
   // The capture handler runs on window before BlueMap's document/canvas hotkeys.
   const blockMapKeys = e => {
    if (!shade.isConnected) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    // Leave browser editing shortcuts and normal typing intact.
    e.stopImmediatePropagation();
   };
   for(const type of ['keydown','keyup','keypress'])window.addEventListener(type,blockMapKeys,true);
   for(const type of ['pointerdown','pointerup','mousedown','mouseup','click','dblclick','wheel','touchstart','touchmove']) {
    shade.addEventListener(type,e=>e.stopPropagation());
   }
   const close=()=>{
    for(const type of ['keydown','keyup','keypress'])window.removeEventListener(type,blockMapKeys,true);
    const img=dialog.querySelector('#ck-memory-preview');
    if(img?.dataset.url)URL.revokeObjectURL(img.dataset.url);
    shade.remove();
    button.focus();
   };
   dialog.querySelector('#ck-close').addEventListener('click',close);
   shade.addEventListener('click',e=>{if(e.target===shade)close()});
   dialog.querySelector('#ck-photo').addEventListener('change',e=>{
    const file=e.target.files[0], img=dialog.querySelector('#ck-memory-preview');
    if(img.dataset.url)URL.revokeObjectURL(img.dataset.url);
    if(file){img.dataset.url=URL.createObjectURL(file);img.src=img.dataset.url;img.hidden=false;}
    else{img.hidden=true;img.removeAttribute('src')}
   });
   dialog.querySelector('#ck-test').addEventListener('click',()=>{
    const title=dialog.querySelector('#ck-title').value.trim();
    dialog.querySelector('#ck-draft-status').textContent=title ? 'Preview ready: '+title+'. This is a test only; no memory has been saved yet.' : 'Enter a title to preview your draft.';
   });
   dialog.querySelector('#ck-title').focus();
  });
  console.info('[Cinta Kita] Memory editor Step 1 loaded');
 });
})();
