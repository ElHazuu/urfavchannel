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
