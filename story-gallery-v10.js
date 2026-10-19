/* Story V4: original gallery remains in place; swipe through photos inside each card. */
(()=>{'use strict';
const section=document.getElementById('story'),gallery=section?.querySelector('.storyGallery');
if(!section||!gallery||document.getElementById('ckstory-v4-controls'))return;
const cards=[...gallery.querySelectorAll(':scope > .storyCardKittenSpot > .storyCard,:scope > .storyCard')];
if(cards.length<3)return;
const categories=['minecraft','real_life','games'];
const root=document.createElement('div');root.id='ckstory-v4-controls';root.innerHTML='<button type="button" id="ckstory-upload" hidden>＋ Add a Picture</button><button type="button" id="ckstory-manage" hidden>✎ Edit Pictures</button><span id="ckstory-status" role="status"></span>';
gallery.before(root);
const btn=root.querySelector('#ckstory-upload'),manage=root.querySelector('#ckstory-manage'),status=root.querySelector('#ckstory-status');
const url='https://djhhwdjgokzofkaemrpf.supabase.co',key='sb_publishable_74Fr4c8T4OIKBgXED-sgsg_iUPBviG0';
let client=null,user=null,rows=[],version=0,album='real_life';
const notify=t=>{status.textContent=t};
const site=document.getElementById('mainWebsite');
function updatePhotoWallpaper(){
 if(!site)return;
 const st=getComputedStyle(site);
 const wp=site.dataset.wallpaper||'original',mode=site.dataset.theme||'dark';
 let bg=st.getPropertyValue('--ui-surface').trim()||st.getPropertyValue('--theme-surface').trim()||'#111';
 if(wp==='underwater')bg=mode==='light'?'#e4f8fc':'#092832';
 else if(wp==='berserk')bg='#0d0d0e';
 else if(wp==='original')bg=mode==='light'?'#fffafc':'#17191e';
 section.style.setProperty('--ck-real-photo-bg',bg);
}
updatePhotoWallpaper();
if(site)new MutationObserver(updatePhotoWallpaper).observe(site,{attributes:true,attributeFilter:['data-wallpaper','data-theme','data-season','style','class']});

const controls=cards.map((card,i)=>{const category=categories[i];const holder=card.parentElement.classList.contains('storyCardKittenSpot')?card.parentElement:(()=>{const d=document.createElement('div');d.className='ckstory-card-holder';card.before(d);d.append(card);return d})();
 holder.classList.add('ckstory-card-holder');holder.dataset.ckCategory=category;
 const overlay=document.createElement('div');overlay.className='ckstory-photo-overlay';overlay.hidden=true;overlay.setAttribute('role','group');overlay.setAttribute('aria-label','Uploaded story photo');
 overlay.innerHTML='<img alt=""><div class="ckstory-upload-note"><strong></strong><span></span></div><button type="button" class="ckstory-delete" hidden>Delete picture</button>';
 card.append(overlay);
 // Catch only clicks on uploaded overlay; original card behavior stays untouched.
 overlay.addEventListener('click',e=>{e.stopPropagation();if(e.target.closest('.ckstory-delete'))return;overlay.classList.toggle('show-note')});
 const previous=document.createElement('button'),next=document.createElement('button');
 previous.type=next.type='button';previous.className='ckstory-photo-arrow ckstory-photo-prev';next.className='ckstory-photo-arrow ckstory-photo-next';previous.textContent='❮';next.textContent='❯';
 previous.setAttribute('aria-label','Previous '+category+' picture');next.setAttribute('aria-label','Next '+category+' picture');
 holder.append(previous,next);
 const current={holder,card,overlay,previous,next,category,index:-1,items:[]};
 previous.onclick=e=>{e.preventDefault();e.stopPropagation();change(current,-1)};
 next.onclick=e=>{e.preventDefault();e.stopPropagation();change(current,1)};
 let x=0,y=0;holder.addEventListener('touchstart',e=>{x=e.touches[0]?.clientX||0;y=e.touches[0]?.clientY||0},{passive:true});holder.addEventListener('touchend',e=>{const dx=(e.changedTouches[0]?.clientX||0)-x,dy=(e.changedTouches[0]?.clientY||0)-y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4){change(current,dx<0?1:-1)}},{passive:true});
 holder.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();change(current,e.key==='ArrowLeft'?-1:1)}});
 return current;
});
function change(c,step){if(!c.items.length)return;c.index=(c.index+step+c.items.length+1)%(c.items.length+1);if(c.index===c.items.length)c.index=-1;paint(c)}
function paint(c){const item=c.items[c.index],uploaded=!!item;const kitten=c.holder.querySelector('#sittingKitten');c.previous.hidden=c.next.hidden=c.items.length===0;
 c.overlay.hidden=!uploaded;
 if(kitten&&uploaded)kitten.style.visibility='hidden';else if(kitten)kitten.style.removeProperty('visibility');
 if(!uploaded)return;
 c.overlay.querySelector('img').src=item.signed;c.overlay.querySelector('img').alt=item.title;
 c.overlay.querySelector('strong').textContent=item.title;c.overlay.querySelector('.ckstory-upload-note span').textContent=item.note||'A little memory together ♡';c.overlay.classList.remove('show-note');c.overlay.classList.remove('ckstory-animate');void c.overlay.offsetWidth;c.overlay.classList.add('ckstory-animate');
 c.overlay.dataset.animation=item.animation||'gentle';c.holder.dataset.animation=item.animation||'gentle';

}
function renderAlbum(){if(user)manage.hidden=false;controls.forEach(c=>{const currentId=c.items[c.index]?.id;c.items=rows.filter(r=>(r.category||'real_life')===c.category&&r.signed);c.index=currentId?c.items.findIndex(r=>r.id===currentId):-1;paint(c)})}
async function sdk(){if(window.supabase?.createClient)return window.supabase;return await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';s.onload=()=>window.supabase?.createClient?resolve(window.supabase):reject(Error('Supabase unavailable'));s.onerror=()=>reject(Error('Could not load Supabase'));document.head.append(s)})}
async function load(){if(!client||!user)return;const seq=++version;const {data,error}=await client.from('site_story_photos').select('id,title,note,photo_path,created_by,created_at,category,animation').order('created_at',{ascending:false});if(seq!==version)return;if(error){notify('Unable to load photos. Check the Story Photos SQL setup.');return}rows=data||[];for(const row of rows){const {data:link,error:err}=await client.storage.from('site-story-photos').createSignedUrl(row.photo_path,3600);if(seq!==version)return;row.signed=!err?link?.signedUrl:null}renderAlbum();notify('')}
async function connect(){try{const lib=await sdk();client=lib.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});const {data:{user:current}}=await client.auth.getUser();user=current;btn.hidden=!user;manage.hidden=!user;if(!user){notify('Sign in to add and view shared pictures.');return}await load();client.auth.onAuthStateChange((_e,session)=>{if(session?.user?.id===user?.id)return;user=session?.user||null;btn.hidden=!user;if(user)queueMicrotask(()=>load());else{version++;rows=[];renderAlbum();notify('Sign in to view shared pictures.')}})}catch(err){notify('Photo connection unavailable: '+err.message)}}
manage.onclick=()=>{if(!user)return;const owned=rows.filter(r=>r.created_by===user.id);const shade=document.createElement('div');shade.className='ckstory-shade ckstory-picker-shade';const panel=document.createElement('section');panel.className='ckstory-picker';const head=document.createElement('header');head.innerHTML='<div><small>OUR STORY • LIBRARY</small><h3>Choose a picture to edit</h3></div><button type="button" class="ckstory-picker-close" aria-label="Close">×</button>';panel.append(head);const list=document.createElement('div');list.className='ckstory-picker-grid';panel.append(list);shade.append(panel);document.body.append(shade);
const site=document.getElementById('mainWebsite');if(site){const cs=getComputedStyle(site);for(const token of ['--ui-accent','--ui-surface','--ui-ink','--ui-line','--ui-field','--scene-accent','--scene-surface','--theme-text','--theme-surface']){const v=cs.getPropertyValue(token).trim();if(v)shade.style.setProperty(token,v)}shade.dataset.wallpaper=site.dataset.wallpaper||'original';shade.dataset.theme=site.dataset.theme||'dark';shade.dataset.season=site.dataset.season||'none'}
function close(){shade.remove()}head.querySelector('button').onclick=close;shade.onclick=e=>{if(e.target===shade)close()};
if(!owned.length){const msg=document.createElement('p');msg.textContent='No uploaded pictures yet. Add your first picture to start editing.';list.append(msg)}
for(const item of owned){const card=document.createElement('button');card.type='button';card.className='ckstory-picker-item';const image=document.createElement('img');image.src=item.signed;image.alt=item.title;const title=document.createElement('strong');title.textContent=item.title;const category=document.createElement('small');category.textContent=({minecraft:'Minecraft',real_life:'Real Life',games:'Other Games'})[item.category]||'Real Life';card.append(image,title,category);card.onclick=()=>{close();openEditor(item)};const group=document.createElement('div');group.className='ckstory-picker-entry';const remove=document.createElement('button');remove.type='button';remove.className='ckstory-picker-remove';remove.textContent='Delete';remove.onclick=async()=>{if(!confirm('Permanently delete “'+item.title+'”?'))return;remove.disabled=true;const {error}=await client.from('site_story_photos').delete().eq('id',item.id).eq('created_by',user.id);if(error){notify(error.message);remove.disabled=false;return}await client.storage.from('site-story-photos').remove([item.photo_path]);close();await load();notify('Picture deleted')};group.append(card,remove);list.append(group)}
};
btn.onclick=()=>openEditor(null);
function openEditor(existing){if(!user)return; if(existing&&existing.created_by!==user.id)return;
const shade=document.createElement('div');shade.className='ckstory-shade ckstory-editor-shade';
shade.innerHTML='<form class="ckstory-form ckstory-editor" novalidate><div class="ckstory-formhead"><div><small>✦ CINTA KITA · PHOTO STUDIO</small><h3>Keep this moment ♡</h3><p>Make your picture feel right before saving it to our story.</p></div><button type="button" class="ckstory-close" aria-label="Close photo editor">×</button></div><div class="ckstory-editor-layout"><section class="ckstory-editor-visual"><label class="ckstory-drop"><input id="ckstory-image-file" type="file" accept="image/jpeg,image/png,image/webp" required><span class="ckstory-drop-icon">✧</span><strong>Choose a picture</strong><span>JPG, PNG or WebP · up to 10 MB</span></label><div class="ckstory-editor-canvasbox" hidden><canvas class="ckstory-edit-canvas" width="960" height="960" aria-label="Live picture crop preview"></canvas><span class="ckstory-canvas-hint">Drag to reposition your picture</span></div><div class="ckstory-image-actions"><button type="button" class="ckstory-choose-again">↺ Replace picture</button><span class="ckstory-format-label">SQUARE PHOTO FRAME</span></div><div class="ckstory-crop-tools"><div class="ckstory-crop-buttons"><button type="button" data-fit="fill" class="active">▣ Fill frame</button><button type="button" data-fit="contain">▢ Fit whole picture</button></div><label class="ckstory-zoom-line">Zoom <input class="ckstory-zoom" type="range" min="100" max="250" step="5" value="100"><output class="ckstory-zoom-value">100%</output></label><button class="ckstory-reset-crop" type="button">Reset position ↺</button></div></section><section class="ckstory-editor-fields"><label class="ckstory-field"><span>01 · THE COLLECTION</span><select name="category"><option value="minecraft">⛏ Minecraft adventures</option><option value="real_life">♡ Real Life moments</option><option value="games">✦ Other games</option></select></label><label class="ckstory-field"><span>02 · MEMORY TITLE</span><input name="title" required maxlength="100" placeholder="Give this moment a name…"><small class="ckstory-title-count">0 / 100</small></label><label class="ckstory-field"><span>03 · OUR LITTLE STORY</span><textarea name="note" maxlength="700" rows="5" placeholder="What made this moment special?"></textarea><small class="ckstory-note-count">0 / 700</small></label><label class="ckstory-field"><span>04 · PHOTO ANIMATION</span><select name="animation"><option value="gentle">✦ Gentle entrance</option><option value="none">◌ No animation</option><option value="float">☁ Floating</option><option value="kenburns">◈ Cinematic slow zoom</option><option value="glow">✧ Soft glow</option><option value="tilt">◇ Subtle tilt</option><option value="polaroid">▣ Polaroid</option><option value="pulse">♡ Breathing pulse</option><option value="reveal">▥ Curtain reveal</option><option value="shimmer">✳ Shimmer</option></select></label><div class="ckstory-memory-tip">♡ Your new picture joins the original card. Use the left and right arrows to see every moment.</div></section></div><footer class="ckstory-editor-footer"><p class="ckstory-feedback" role="status"></p><div><button type="button" class="ckstory-cancel">Cancel</button><button class="ckstory-submit" type="submit">✦ Save our memory</button></div></footer></form>';
document.body.append(shade);
const mainTheme=document.getElementById('mainWebsite');
const themeKeys=['--ui-accent','--ui-surface','--ui-ink','--ui-field','--ui-line','--theme-accent','--theme-bg','--theme-surface','--theme-text','--theme-line','--scene-accent','--scene-surface','--flag-accent','--flag-surface','--flag-text','--flag-line'];
function syncEditorTheme(){if(!mainTheme)return;const computed=getComputedStyle(mainTheme);for(const name of themeKeys){const value=computed.getPropertyValue(name).trim();if(value)shade.style.setProperty(name,value)}shade.dataset.wallpaper=mainTheme.dataset.wallpaper||'original';shade.dataset.theme=mainTheme.dataset.theme||'dark';shade.dataset.season=mainTheme.dataset.season||'none'}
syncEditorTheme();const themeObserver=mainTheme?new MutationObserver(syncEditorTheme):null;themeObserver?.observe(mainTheme,{attributes:true,attributeFilter:['class','style','data-wallpaper','data-theme','data-season']});
const form=shade.querySelector('form'),file=shade.querySelector('#ckstory-image-file'),drop=shade.querySelector('.ckstory-drop'),box=shade.querySelector('.ckstory-editor-canvasbox'),canvas=shade.querySelector('canvas'),ctx=canvas.getContext('2d'),feedback=shade.querySelector('.ckstory-feedback'),zoomInput=shade.querySelector('.ckstory-zoom'),zoomOutput=shade.querySelector('.ckstory-zoom-value');
const modes=[...shade.querySelectorAll('[data-fit]')];let source=null,loaded=null,objectUrl=null,fit='fill',zoom=1,panX=0,panY=0,drag=null,busy=false;
form.elements.category.value=existing?.category||album;form.elements.animation.value=existing?.animation||'gentle';if(existing){title.value=existing.title;note.value=existing.note||'';title.dispatchEvent(new Event('input'));note.dispatchEvent(new Event('input'));form.querySelector('.ckstory-submit').textContent='✦ Save changes';shade.querySelector('.ckstory-formhead h3').textContent='Edit our memory ♡';}
const title=form.elements.title,note=form.elements.note;
title.oninput=()=>shade.querySelector('.ckstory-title-count').textContent=title.value.length+' / 100';
note.oninput=()=>shade.querySelector('.ckstory-note-count').textContent=note.value.length+' / 700';
function close(){if(!shade.isConnected)return;if(busy&&!confirm('The photo is still saving. Close the editor? The save may finish in the background.'))return;themeObserver?.disconnect();document.removeEventListener('keydown',editorEscape);if(objectUrl)URL.revokeObjectURL(objectUrl);shade.remove()}
function editorEscape(e){if(e.key==='Escape'&&shade.isConnected){e.stopPropagation();close()}}
document.addEventListener('keydown',editorEscape,true);
shade.querySelector('.ckstory-close').onclick=e=>{e.preventDefault();close()};shade.querySelector('.ckstory-cancel').onclick=e=>{e.preventDefault();close()};shade.onclick=e=>{if(e.target===shade)close()};
function draw(target=canvas){if(!loaded)return;const c=target.getContext('2d');const w=target.width,h=target.height,iw=loaded.naturalWidth,ih=loaded.naturalHeight;
c.clearRect(0,0,w,h);c.fillStyle='#241c2a';c.fillRect(0,0,w,h);
const base=(fit==='fill'?Math.max(w/iw,h/ih):Math.min(w/iw,h/ih)),factor=base*zoom,dw=iw*factor,dh=ih*factor;
const overflowX=Math.max(0,(dw-w)/2),overflowY=Math.max(0,(dh-h)/2);
const dx=(w-dw)/2+panX*overflowX,dy=(h-dh)/2+panY*overflowY;
c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(loaded,dx,dy,dw,dh);
}
function reset(){zoom=1;panX=panY=0;zoomInput.value='100';zoomOutput.value='100%';draw()}
modes.forEach(b=>b.onclick=()=>{fit=b.dataset.fit;modes.forEach(x=>x.classList.toggle('active',x===b));reset()});
zoomInput.oninput=()=>{zoom=Number(zoomInput.value)/100;zoomOutput.value=zoomInput.value+'%';draw()};
shade.querySelector('.ckstory-reset-crop').onclick=reset;
canvas.addEventListener('pointerdown',e=>{if(!loaded)return;drag={x:e.clientX,y:e.clientY,panX,panY};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(!drag||!loaded)return;const factor=(fit==='fill'?Math.max(960/loaded.naturalWidth,960/loaded.naturalHeight):Math.min(960/loaded.naturalWidth,960/loaded.naturalHeight))*zoom;const x=Math.max(1,(loaded.naturalWidth*factor-960)/2),y=Math.max(1,(loaded.naturalHeight*factor-960)/2);panX=Math.max(-1,Math.min(1,drag.panX+(e.clientX-drag.x)*(960/canvas.clientWidth)/x));panY=Math.max(-1,Math.min(1,drag.panY+(e.clientY-drag.y)*(960/canvas.clientHeight)/y));draw()});
canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
shade.querySelector('.ckstory-choose-again').onclick=()=>file.click();
file.onchange=()=>{const f=file.files?.[0];if(!f)return;if(!['image/jpeg','image/png','image/webp'].includes(f.type)){feedback.textContent='Choose JPG, PNG or WebP.';return}if(f.size>10*1024*1024){feedback.textContent='Please choose a photo under 10 MB.';return}if(objectUrl)URL.revokeObjectURL(objectUrl);source=f;objectUrl=URL.createObjectURL(f);const img=new Image();img.onload=()=>{loaded=img;drop.hidden=true;box.hidden=false;reset();feedback.textContent=''};img.onerror=()=>feedback.textContent='Could not open this picture.';img.src=objectUrl};
form.onsubmit=async e=>{e.preventDefault();if(!user||busy)return;if(!existing&&(!source||!loaded)){feedback.textContent='Choose a picture first.';return}const name=title.value.trim();if(!name){feedback.textContent='Give your memory a title.';title.focus();return}
busy=true;const save=form.querySelector('.ckstory-submit');save.disabled=true;feedback.textContent='Preparing your picture…';
try{
let photoPath=existing?.photo_path||null;
if(source&&loaded){
 const output=document.createElement('canvas');output.width=2400;output.height=2400;draw(output);
 const blob=await new Promise(resolve=>output.toBlob(resolve,'image/jpeg',.95));if(!blob)throw Error('Could not prepare your picture.');
 // For edits use a fresh path to preserve previous photo if DB update fails.
 photoPath=user.id+'/'+crypto.randomUUID()+'.jpg';feedback.textContent='Uploading the full-quality photo…';
 const upload=await client.storage.from('site-story-photos').upload(photoPath,blob,{contentType:'image/jpeg'});if(upload.error)throw upload.error;
}
const payload={title:name,note:note.value.trim(),category:form.elements.category.value,animation:form.elements.animation.value};
if(photoPath)payload.photo_path=photoPath;
const result=existing?await client.from('site_story_photos').update(payload).eq('id',existing.id).eq('created_by',user.id).select('id'):await client.from('site_story_photos').insert({...payload,created_by:user.id}).select('id');
if(result.error||!result.data?.length){if(photoPath&&photoPath!==existing?.photo_path)await client.storage.from('site-story-photos').remove([photoPath]);throw result.error||Error('The edit was not permitted. Run the story editing SQL.')}
if(existing&&source&&photoPath!==existing.photo_path)await client.storage.from('site-story-photos').remove([existing.photo_path]);
const chosen=form.elements.category.value;themeObserver?.disconnect();document.removeEventListener('keydown',editorEscape);if(objectUrl)URL.revokeObjectURL(objectUrl);shade.remove();await load();const target=controls.find(c=>c.category===chosen);if(target){const position=target.items.findIndex(x=>x.id===result.data[0].id);target.index=position<0?-1:position;paint(target)}notify(existing?'Memory updated ♡':'Memory saved ♡');
}catch(error){feedback.textContent=error.message||'Could not save this memory.';save.disabled=false;busy=false}};
};
connect();
})();