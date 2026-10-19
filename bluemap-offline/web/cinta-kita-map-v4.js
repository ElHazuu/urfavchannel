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


/* Cinta Kita offline map memories — Supabase shared storage phase.
 * The 3D world pin rendering still requires BlueMap viewer integration. */
(() => {
 'use strict';
 if(window.__ckMemoryDraftV1)return;
 window.__ckMemoryDraftV1=true;
 const cloud={items:[],client:null,user:null,member:false};
 let feedbackTimer;
 const setCloudStatus=(message)=>{
  const el=document.getElementById('ck-m-status');
  if(!el)return;
  // Membership is shown by the single persistent badge. This is action feedback only.
  if(message.includes('shared memories loaded'))return;
  el.textContent=message;
  el.style.display='block';
  clearTimeout(feedbackTimer);
  feedbackTimer=setTimeout(()=>{if(el.isConnected)el.style.display='none'},4500);
 };
 const requireCloud=()=>{
  if(!cloud.member || !cloud.client || !cloud.user){setCloudStatus('Sign in as an approved member before saving.');return false}
  return true;
 };
 const columns='id,map_id,dimension,x,y,z,title,notes,youtube_url,created_at,updated_at,created_by';
 function translate(row){return {id:row.id,x:row.x,y:row.y,z:row.z,dimension:row.dimension,title:row.title||'New Memory',notes:row.notes||'',youtube:row.youtube_url||'',createdAt:row.created_at}}
 // Only approved members receive a private hover title; public pins stay anonymous.
function installMemberPinLabels(){
 const items=cloud.items;
 document.querySelectorAll('.ck-world-stamp[data-memory-id]').forEach(el=>{
  const item=items.find(x=>String(x.id)===el.dataset.memoryId);
  if(!item)return;
  el.setAttribute('title',item.title||'Memory');
  el.setAttribute('aria-label',item.title||'Memory');
  el.dataset.memberTitle=item.title||'Memory';
 });
}


 async function loadCloud(){
  if(!requireCloud())return;
  const {data,error}=await cloud.client.from('ck_map_memories').select(columns).eq('map_id','our_vanilla_world').order('created_at',{ascending:false});
  if(error)throw error;
  cloud.items=(data||[]).map(translate);
  reconcilePins();
  installMemberPinLabels();
  // Count is reflected in My Markers; don't overlap the member badge.
 }
 async function writeNew(pos,title){
  if(!requireCloud())return false;
  const data={map_id:'our_vanilla_world',dimension:'minecraft:overworld',x:pos.x,y:pos.y,z:pos.z,title:title||'',notes:'',youtube_url:null,created_by:cloud.user.id};
  const {error}=await cloud.client.from('ck_map_memories').insert(data);
  if(error)throw error;
  await loadCloud();return true;
 }
 async function writeEdit(id,values){
  if(!requireCloud())return false;
  const {error}=await cloud.client.from('ck_map_memories').update({title:values.title,notes:values.notes,youtube_url:values.youtube||null}).eq('id',id);
  if(error)throw error;
  await loadCloud();return true;
 }
 // Hide stale public BlueMap pins as soon as members delete their records.
 // Static public marker JSON is subsequently refreshed by the GitHub scheduled publisher.
 const removedPins=new Set();
 function reconcilePins(){
  if(!cloud.member)return;
  const live=new Set(cloud.items.map(item=>String(item.id)));
  for(const el of document.querySelectorAll('.ck-world-stamp[data-memory-id]')){
   if(!live.has(String(el.dataset.memoryId)))hideRemovedPin(el.dataset.memoryId);
  }
 }
 function hideRemovedPin(id){
  removedPins.add(String(id));
  for(const el of document.querySelectorAll('.ck-world-stamp[data-memory-id]')){
   if(removedPins.has(String(el.dataset.memoryId))){
    const wrapper=el.closest('.ck-memory-map-marker')||el.parentElement;
    if(wrapper)wrapper.style.setProperty('display','none','important');
    el.style.setProperty('display','none','important');
   }
  }
 }
 async function writeDelete(id){
  if(!requireCloud())return false;
  const {data,error}=await cloud.client.from('ck_map_memories').delete().eq('id',id).select('id');
  if(error)throw error;
  if(!data?.some(row=>String(row.id)===String(id)))throw new Error('Delete was not confirmed by Supabase. Check permission or try again.');
  cloud.items=cloud.items.filter(item=>String(item.id)!==String(id));
  hideRemovedPin(id);
  await loadCloud();
  return true;
 }
 // The connection-check module fires this event after successful membership verification.
 window.addEventListener('ck-map-member-ready',async e=>{
  cloud.client=e.detail.client;cloud.user=e.detail.user;cloud.member=true;
  try{await loadCloud()}catch(err){setCloudStatus('Could not load shared memories');console.warn('[Cinta Kita] memories load',err)}
 });
 const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
 ready(()=>{
 const style=document.createElement('style');
 style.textContent=`
 #ck-memory-controls{position:fixed;bottom:68px;left:16px;right:auto;z-index:2147481000;display:flex;align-items:start;flex-direction:column;gap:8px;font-family:system-ui,sans-serif}
 .ck-m-button{padding:11px 15px;background:var(--ck-surface,#302337ed);color:var(--ck-accent,#fbd3e3);border:1px solid var(--ck-stroke,#d4a2be);border-radius:12px;cursor:pointer;box-shadow:0 6px 20px #0008;transition:transform .15s}
 .ck-m-button:hover{transform:scale(1.06)}
 #ck-m-hint{max-width:310px;padding:12px;background:#231b2cee;color:white;border-radius:12px;font-size:12px;line-height:1.4;display:none}
 #ck-m-modal{position:fixed;inset:0;z-index:2147482000;background:#09050acc;display:flex;justify-content:center;align-items:center;padding:16px;font-family:system-ui,sans-serif}
 #ck-m-card{background:var(--ck-surface,#251b2bef);color:white;border:1px solid var(--ck-stroke,#ecc4d5);border-radius:16px;max-width:480px;width:100%;max-height:90vh;overflow:auto;padding:20px}
 #ck-m-card h2{margin:0 0 12px;color:var(--ck-accent,#fbd3e3)}
 #ck-m-card p{font-size:12px;line-height:1.5;color:#e9deeb}
 #ck-m-card label{display:block;font-size:12px;margin:12px 0}
 #ck-m-card input,#ck-m-card textarea{width:100%;font:inherit;margin-top:5px;padding:10px;box-sizing:border-box;color:white;background:#17121bc9;border:1px solid #806b7e;border-radius:9px}
 #ck-m-card button{padding:9px 12px;margin:4px 4px 0 0;border-radius:9px;background:#5d405a;color:white;border:1px solid #af85a3;cursor:pointer}
 #ck-m-card .ck-m-entry{padding:9px 0;border-bottom:1px solid #ffffff33}
 #ck-m-card small{color:#d4c4d0}
 #ck-m-status{font-size:12px;color:#efcfdd;max-width:270px;text-align:left}
 .ck-m-entry{position:relative;transition:background .2s,padding .2s;border-radius:11px}
 .ck-m-entry:hover,.ck-m-entry:focus-within{background:#ffffff12;padding-left:8px;padding-right:8px}
 .ck-m-entry .ck-hovercard{max-height:0;opacity:0;overflow:hidden;transition:max-height .24s ease,opacity .2s ease;margin-top:4px}
 .ck-m-entry:hover .ck-hovercard,.ck-m-entry:focus-within .ck-hovercard,.ck-m-entry.ck-expanded .ck-hovercard{max-height:320px;opacity:1}
 .ck-hovercard{font-size:12px;color:#e9deeb}
 .ck-hovercard .ck-thumb{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:10px;display:block;margin:7px 0;cursor:pointer}
 .ck-hovercard iframe{width:100%;aspect-ratio:16/9;display:block;border:0;border-radius:10px;margin:7px 0}
 .ck-hovercard .ck-note{white-space:pre-wrap;overflow-wrap:anywhere}
 @media(hover:none){.ck-m-entry .ck-hovercard{max-height:320px;opacity:1}}

 /* Minecraft inventory / Dynmap-style memory panels */
 @import url('https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&display=swap');
 #ck-m-modal{background:#050a07bc!important;backdrop-filter:blur(2px)}
 #ck-m-card{--ck-ui-accent:var(--ck-accent,#91b381);--ck-ui-border:color-mix(in srgb,var(--ck-ui-accent) 65%,#101b13);
 background:linear-gradient(135deg,#344136f7,#1b271ffc)!important;color:#edf3e8!important;
 border:4px solid #141b15!important;outline:2px solid var(--ck-ui-border)!important;border-radius:3px!important;
 box-shadow:inset 3px 3px #84918777,inset -3px -3px #0d170fb3,0 8px 0 #111810,0 20px 50px #000b!important;
 font-family:'Pixelify Sans','Trebuchet MS',sans-serif!important;max-width:560px!important;padding:20px!important}
 #ck-m-card h2{color:var(--ck-ui-accent)!important;font:700 25px/1.1 'Pixelify Sans',sans-serif!important;
 margin-bottom:14px!important;border-bottom:2px solid #70857085;padding-bottom:12px!important;text-shadow:2px 2px #101a11}
 #ck-m-card p,#ck-m-card label,#ck-m-card small,#ck-m-card strong{font-family:'Pixelify Sans','Trebuchet MS',sans-serif!important}
 #ck-m-card p{font-size:15px!important;line-height:1.35!important;color:#e5eee1!important}
 #ck-m-card strong{font-size:19px!important;color:#e8f1e4}
 #ck-m-card label{font-size:15px!important;color:#dbe9d2}
 #ck-m-card input,#ck-m-card textarea{font:16px 'Pixelify Sans',sans-serif!important;background:#111c16!important;
 color:#f1f7e9!important;border:3px solid #263b2d!important;border-radius:2px!important;padding:10px!important;
 box-shadow:inset 2px 2px 0 #07130b,inset -2px -2px 0 #6b786755!important}
 #ck-m-card input:focus,#ck-m-card textarea:focus{outline:2px solid var(--ck-ui-accent)!important}
 #ck-m-card button{font:600 16px 'Pixelify Sans',sans-serif!important;color:#f3f6ed!important;
 border:2px solid #152118!important;border-radius:2px!important;padding:8px 12px!important;
 background:linear-gradient(180deg,color-mix(in srgb,var(--ck-ui-accent) 62%,#3c523c),color-mix(in srgb,var(--ck-ui-accent) 35%,#1e3226))!important;
 box-shadow:inset 2px 2px #efffdd77,inset -2px -2px #1426198c,0 3px 0 #0b150f!important;
 text-shadow:1px 2px #0d2116!important;cursor:pointer!important}
 #ck-m-card button:hover{filter:brightness(1.22)!important;transform:translateY(-2px)!important}
 #ck-m-card button:active{transform:translateY(2px)!important}
 #ck-m-card .ck-m-entry{border-bottom:2px dashed #80947d80!important;border-radius:0!important;padding:12px 0!important}
 #ck-m-card .ck-m-entry:hover{background:#97ba8724!important}
 #ck-m-card .ck-hovercard{font-size:15px!important;color:#d7ead3!important}
 #ck-m-card .ck-thumb,#ck-m-card iframe{border-radius:2px!important;border:2px solid #82967c!important}
 
 
 `;
 document.head.append(style);
 const controls=document.createElement('div');controls.id='ck-memory-controls';
 const hint=document.createElement('div');hint.id='ck-m-hint';controls.append(hint);
 const status=document.createElement('span');status.id='ck-m-status';status.style.display='none';controls.append(status);
 const add=document.createElement('button');add.className='ck-m-button';add.textContent='＋ Add Marker';controls.append(add);
 const list=document.createElement('button');list.className='ck-m-button';list.textContent='♡ My Markers';controls.append(list);
 document.body.append(controls);
 // Parent toolbar sends visibility changes; default is visible.
 window.addEventListener('message',e=>{if(e.origin===location.origin && e.source===window.parent && e.data?.type==='ck-map-ui-visibility'){controls.style.display=e.data.visible?'flex':'none';const memberBadge=document.getElementById('ck-supabase-status');if(memberBadge)memberBadge.style.display=e.data.visible?'block':'none';}});
 const parse=()=>cloud.items;
 let placing=false,observer=null,timeout=null,lastClick=0;
 const pattern=/\bx\s*[:=]\s*(-?\d+)\s*[,;\s]+\by\s*[:=]\s*(-?\d+)\s*[,;\s]+\bz\s*[:=]\s*(-?\d+)\b/i;
 function readPosition(){
  for(const e of document.querySelectorAll('div,span,p')){
   if(e.closest('#ck-memory-controls,#ck-m-modal')||e.children.length>5)continue;
   const t=(e.textContent||'').trim();
   if(t.length>180||!/\bblock\s*:/i.test(t))continue;
   const m=t.match(pattern);
   if(m)return {x:+m[1],y:+m[2],z:+m[3]};
  }
  return null;
 }
 function stop(){placing=false;add.textContent='＋ Add Marker';hint.style.display='none';if(observer){observer.disconnect();observer=null}if(timeout){clearTimeout(timeout);timeout=null}}
 function modal(title,build){
  const shade=document.createElement('div');shade.id='ck-m-modal';
  const card=document.createElement('section');card.id='ck-m-card';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');
  const h=document.createElement('h2');h.textContent=title;card.append(h);shade.append(card);document.body.append(shade);
  function close(){window.removeEventListener('keydown',keys,true);shade.remove()}
  function keys(e){if(e.key==='Escape'){e.preventDefault();close();return}e.stopImmediatePropagation()}
  window.addEventListener('keydown',keys,true);
  for(const event of ['pointerdown','mousedown','mouseup','click','dblclick','wheel','touchstart'])shade.addEventListener(event,e=>e.stopPropagation());
  shade.addEventListener('click',e=>{if(e.target===shade)close()});
  build(card,close);
 }
 const p=(parent,text)=>{const x=document.createElement('p');x.textContent=text;parent.append(x);return x};
 const btn=(parent,text,action)=>{const x=document.createElement('button');x.type='button';x.textContent=text;x.addEventListener('click',action);parent.append(x);return x};
 function selected(pos){stop();
  modal('New map marker', (card,close)=>{
   p(card,`Selected block · X ${pos.x} · Y ${pos.y} · Z ${pos.z}`);
   p(card,'Title, notes and videos are optional. Save a blank marker now and edit it later.');
   const name=document.createElement('input');name.placeholder='Optional title';name.maxLength=100;card.append(name);
   let saving=false;
   const feedback=p(card,'Ready to save.');
   const saveButton=btn(card,'Save marker',async()=>{
    if(saving)return;
    saving=true;saveButton.disabled=true;saveButton.textContent='Saving…';feedback.textContent='Saving your marker to Supabase…';
    try{
     const ok=await writeNew(pos,name.value.trim());
     if(ok){
      feedback.textContent='✓ Saved successfully!';
      setCloudStatus('✓ Marker saved successfully');
      saveButton.textContent='✓ Saved';
      setTimeout(()=>{if(card.isConnected){close();openList()}},750);
     }else{saving=false;saveButton.disabled=false;saveButton.textContent='Try saving again';feedback.textContent='Please sign in before saving.'}
    }catch(err){
     saving=false;saveButton.disabled=false;saveButton.textContent='Try saving again';
     feedback.textContent='Save failed: '+err.message;setCloudStatus('Save failed: '+err.message);
     console.warn('[Cinta Kita] insert',err);
    }
   });btn(card,'Cancel',close);
  });
 }
 // Navigate to a saved location using BlueMap's URL anchor.
 function goToMarker(item){
  const coords=[item.x,item.y,item.z].map(Number);
  if(!coords.every(Number.isFinite)){setCloudStatus('Invalid marker coordinates.');return}
  const current=decodeURIComponent(location.hash.slice(1));
  const parts=current.split(':');
  const valid=parts.length>=10 && parts.slice(1,4).every(x=>Number.isFinite(Number(x)));
  const mapId=valid?parts[0]:'our_vanilla_world';
  const next=valid?parts.slice():[mapId,'0','64','0','180','0','0','0','0','perspective'];
  next[1]=String(coords[0]);next[2]=String(coords[1]);next[3]=String(coords[2]);
  if(valid)next[4]=String(Math.min(450,Math.max(100,Number(next[4])||180)));
  // BlueMap supports this URL-anchor format for map and camera positions.
  location.hash=next.join(':');
  location.reload();
 }
 // Validated YouTube IDs only. An iframe is created only after user clicks Play.
 function ytId(url){
  try{
   const u=new URL(url);const host=u.hostname.toLowerCase().replace(/^www\./,'');
   let id='';
   if(host==='youtu.be')id=u.pathname.split('/')[1]||'';
   else if(host==='youtube.com'||host==='m.youtube.com'||host==='youtube-nocookie.com'){
    if(u.pathname==='/watch')id=u.searchParams.get('v')||'';
    else if(/^\/(shorts|embed|live)\//.test(u.pathname))id=u.pathname.split('/')[2]||'';
   }
   return /^[a-zA-Z0-9_-]{11}$/.test(id)?id:null;
  }catch{return null}
 }
 function addPreview(section,item){
  const preview=document.createElement('div');preview.className='ck-hovercard';
  const date=document.createElement('div');date.textContent='Created '+new Date(item.createdAt).toLocaleString();preview.append(date);
  if(item.notes){const note=document.createElement('p');note.className='ck-note';note.textContent=item.notes.length>220?item.notes.slice(0,220)+'…':item.notes;preview.append(note)}
  const video=ytId(item.youtube||'');
  if(video){
   const thumb=document.createElement('img');thumb.className='ck-thumb';thumb.src='https://i.ytimg.com/vi/'+video+'/hqdefault.jpg';thumb.alt='YouTube preview for '+(item.title||'memory');thumb.loading='lazy';
   const play=btn(preview,'▶ Play YouTube clip',()=>{
    if(!thumb.isConnected)return;
    const frame=document.createElement('iframe');frame.title='YouTube video: '+(item.title||'memory');frame.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';frame.allowFullscreen=true;
    frame.referrerPolicy='strict-origin-when-cross-origin';frame.src='https://www.youtube-nocookie.com/embed/'+video+'?autoplay=1';
    thumb.replaceWith(frame);play.remove();
   });
   preview.insertBefore(thumb,play);
  }else{const msg=document.createElement('small');msg.textContent='No YouTube clip yet · Edit to add one';preview.append(msg)}
  const hint=document.createElement('small');hint.textContent='Hover to preview · Click Play for video';preview.append(hint);
  section.append(preview);
 }
 function openList(){
  modal('My memory drafts', (card,close)=>{
   p(card,'Shared memories stored in Supabase. 3D terrain pins are not yet connected to BlueMap.');
   const all=parse();if(!all.length)p(card,'No markers yet. Click Add Marker and select a block.');
   all.forEach(item=>{
    const section=document.createElement('div');section.className='ck-m-entry';card.append(section);
    const name=document.createElement('strong');name.textContent=item.title;section.append(name);
    p(section,`X ${item.x}, Y ${item.y}, Z ${item.z}`);
    addPreview(section,item);
    btn(section,'➤ Go to Marker',()=>goToMarker(item));
    btn(section,'Edit',()=>{close();edit(item.id)});
    const removeButton=btn(section,'Delete',async()=>{
     if(!confirm('Delete this shared memory?'))return;
     removeButton.disabled=true;removeButton.textContent='Deleting…';
     try{
      if(await writeDelete(item.id)){
       section.remove();
       setCloudStatus('✓ Marker deleted');
       const remaining=card.querySelectorAll('.ck-m-entry').length;
       if(!remaining)p(card,'No markers left. Click Add Marker to create one.');
      }else{removeButton.disabled=false;removeButton.textContent='Delete';}
     }catch(err){
      removeButton.disabled=false;removeButton.textContent='Delete';
      setCloudStatus('Delete failed: '+err.message);
      console.warn('[Cinta Kita] delete',err);
     }
    });
   });
   btn(card,'Close',close);
  });
 }
 function edit(id){const item=parse().find(x=>x.id===id);if(!item)return;
  modal('Edit memory', (card,close)=>{
   p(card,`X ${item.x} · Y ${item.y} · Z ${item.z} · Created ${new Date(item.createdAt).toLocaleString()}`);
   function field(label,value,multiline=false){const l=document.createElement('label');l.textContent=label;const el=document.createElement(multiline?'textarea':'input');el.value=value||'';if(multiline)el.rows=4;l.append(el);card.append(l);return el}
   const title=field('Title',item.title),notes=field('Notes',item.notes,true),youtube=field('YouTube link (optional)',item.youtube);
   let saving=false;
   const feedback=p(card,'Ready to save changes.');
   const saveButton=btn(card,'Save changes',async()=>{
    if(saving)return;
    saving=true;saveButton.disabled=true;saveButton.textContent='Saving…';feedback.textContent='Saving your changes…';
    try{
     if(await writeEdit(id,{title:title.value.trim(),notes:notes.value,youtube:youtube.value.trim()})){
      feedback.textContent='✓ Changes saved successfully!';
      setCloudStatus('✓ Memory changes saved');
      saveButton.textContent='✓ Saved';
      setTimeout(()=>{if(card.isConnected){close();openList()}},750);
     }else{saving=false;saveButton.disabled=false;saveButton.textContent='Try saving again';feedback.textContent='Please sign in before saving.'}
    }catch(err){
     saving=false;saveButton.disabled=false;saveButton.textContent='Try saving again';
     feedback.textContent='Save failed: '+err.message;setCloudStatus('Edit failed: '+err.message);
     console.warn('[Cinta Kita] update',err);
    }
   });btn(card,'Cancel',close);
  });
 }
 // Dynmap-like map stamp: click opens the member-only memory card.
 // Public marker data contains only the marker ID and position.
 document.addEventListener('pointerover',e=>{
  const pin=e.target.closest?.('.ck-world-stamp[data-memory-id]');
  if(!pin)return;
  const item=cloud.items.find(x=>String(x.id)===pin.dataset.memoryId);
  if(item && cloud.member){pin.dataset.memberTitle=item.title||'Memory';pin.setAttribute('title',item.title||'Memory')}
 },true);
 // BlueMap sometimes inserts its HTML marker elements after Supabase has loaded.
 const pinObserver=new MutationObserver(()=>{if(cloud.member){installMemberPinLabels();reconcilePins()}for(const id of removedPins)hideRemovedPin(id)});
 pinObserver.observe(document.body,{childList:true,subtree:true});
 document.addEventListener('click',async e=>{
  const pin=e.target.closest?.('.ck-world-stamp');
  if(!pin)return;
  e.preventDefault();e.stopPropagation();
  const id=pin.dataset.memoryId;
  if(!id)return;
  // Reuse the verified member client even if the ready event was missed.
  const client=cloud.client||window.__ckMapSupabaseClient;
  if(!client){
   modal('Memory marker',(card,close)=>{
    p(card,'Sign in with an approved Cinta Kita account to view this private memory.');
    btn(card,'Close',close);
   });
   return;
  }
  try{
   const {data:membership,error:memberError}=await client.rpc('ck_is_map_member');
   if(memberError)throw memberError;
   if(membership!==true){
    modal('Memory marker',(card,close)=>{p(card,'This memory is only visible to approved Cinta Kita members.');btn(card,'Close',close)});
    return;
   }
   cloud.client=client;cloud.member=true;
   let item=cloud.items.find(m=>String(m.id)===id);
   // Always fetch the clicked record with the user's authenticated session.
   // The public marker contains no title, notes or video.
   const {data,error}=await client.from('ck_map_memories').select(columns).eq('id',id).eq('map_id','our_vanilla_world').maybeSingle();
   if(error)throw error;
   if(data){item=translate(data);const i=cloud.items.findIndex(m=>String(m.id)===id);if(i>=0)cloud.items[i]=item;else cloud.items.push(item)}
   if(!item){
    modal('Memory not found',(card,close)=>{p(card,'This pin may be from an older map export, or its saved memory was deleted. Try My Markers to see your current memories.');btn(card,'Close',close)});
    return;
   }
   modal(item.title||'Memory',(card,close)=>{
    p(card,'X '+item.x+' · Y '+item.y+' · Z '+item.z);
    const details=document.createElement('div');details.className='ck-m-entry ck-expanded';card.append(details);
    addPreview(details,item);
    btn(card,'Edit memory',()=>{close();edit(item.id)});
    btn(card,'Close',close);
   });
  }catch(err){
   console.warn('[Cinta Kita] marker details',err);
   modal('Could not open memory',(card,close)=>{
    p(card,'Your account is connected, but the memory could not be loaded: '+(err.message||'Unknown error'));
    btn(card,'Close',close);
   });
  }
 },true);

 function inspect(){if(!placing||Date.now()-lastClick>2500)return;const p=readPosition();if(p)selected(p)}
 add.addEventListener('click',()=>{
  if(placing){stop();return}placing=true;lastClick=0;add.textContent='✕ Cancel';
  hint.textContent='Click any solid block in the 3D world to choose a marker position.';hint.style.display='block';
  observer=new MutationObserver(inspect);observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 });
 document.addEventListener('click',e=>{
  if(!placing||e.target.closest('#ck-memory-controls,#ck-m-modal'))return;
  lastClick=Date.now();if(timeout)clearTimeout(timeout);
  timeout=setTimeout(()=>{if(placing){const p=readPosition();if(p)selected(p);else hint.textContent='Could not read this block. Try clicking another block.'}},650);
 },true);
 list.addEventListener('click',openList);
 console.info('[Cinta Kita] shared memory editing module loaded');
 });
})();


/* Cinta Kita Maps — membership connection verification V2 (no writes yet).
 * Reuses the Supabase project and login already used on the main site.
 */
(() => {
 'use strict';
 if(window.__ckMembershipCheck)return;
 window.__ckMembershipCheck=true;
 const ready=f=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',f,{once:true}):f();
 ready(async()=>{
  const status=document.createElement('div');
  status.id='ck-supabase-status';
  Object.assign(status.style,{position:'fixed',right:'16px',bottom:'177px',zIndex:'2147481000',padding:'7px 11px',font:'12px system-ui,sans-serif',borderRadius:'10px',color:'#fff',background:'var(--ck-surface,#332436eb)',border:'1px solid var(--ck-stroke,#bd9eb9)',boxShadow:'0 6px 18px #0006'});
  status.textContent='Memories: checking membership (V2)…';
  document.body.append(status);
  const url='https://djhhwdjgokzofkaemrpf.supabase.co';
  const key='sb_publishable_74Fr4c8T4OIKBgXED-sgsg_iUPBviG0';
  function sdk(){return new Promise((resolve,reject)=>{
   if(window.supabase?.createClient)return resolve(window.supabase);
   const el=document.createElement('script');
   el.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
   el.onload=()=>window.supabase?.createClient?resolve(window.supabase):reject(new Error('Supabase SDK unavailable'));
   el.onerror=()=>reject(new Error('Supabase SDK failed to load'));
   document.head.append(el);
  })}
  try{
   const lib=await sdk();
   const client=lib.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
   const {data:{session},error:sessionError}=await client.auth.getSession();
   if(sessionError||!session){status.textContent='Memories: no session in map iframe';return}
   const {data:{user},error:userError}=await client.auth.getUser();
   if(userError||!user){status.textContent='Memories: session expired';return}
   const {data,error}=await client.rpc('ck_is_map_member');
   if(error){status.textContent='Memories: membership check failed';console.warn('[Cinta Kita] membership check',error);return}
   if(data===true){status.textContent='✓ Memories: member connected';window.__ckMapSupabaseClient=client;window.__ckMapMemberUser=user;window.dispatchEvent(new CustomEvent('ck-map-member-ready',{detail:{client,user}}));}
   else status.textContent='Memories: view only';
  }catch(e){status.textContent='Memories: connection unavailable';console.warn('[Cinta Kita] Supabase',e)}
 });
})();
