/* Story V4: original gallery remains in place; swipe through photos inside each card. */
(()=>{'use strict';
const section=document.getElementById('story'),gallery=section?.querySelector('.storyGallery');
if(!section||!gallery||document.getElementById('ckstory-v4-controls'))return;
const cards=[...gallery.querySelectorAll(':scope > .storyCardKittenSpot > .storyCard,:scope > .storyCard')];
if(cards.length<3)return;
const categories=['minecraft','real_life','games'];
const root=document.createElement('div');root.id='ckstory-v4-controls';root.innerHTML='<button type="button" id="ckstory-upload" hidden>＋ Add a picture</button><span id="ckstory-status" role="status"></span>';
gallery.before(root);
const btn=root.querySelector('#ckstory-upload'),status=root.querySelector('#ckstory-status');
const url='https://djhhwdjgokzofkaemrpf.supabase.co',key='sb_publishable_74Fr4c8T4OIKBgXED-sgsg_iUPBviG0';
let client=null,user=null,rows=[],version=0,album='real_life';
const notify=t=>{status.textContent=t};
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
 const current={holder,card,overlay,previous,next,category,index:0,items:[]};
 previous.onclick=e=>{e.preventDefault();e.stopPropagation();change(current,-1)};
 next.onclick=e=>{e.preventDefault();e.stopPropagation();change(current,1)};
 let x=0,y=0;holder.addEventListener('touchstart',e=>{x=e.touches[0]?.clientX||0;y=e.touches[0]?.clientY||0},{passive:true});holder.addEventListener('touchend',e=>{const dx=(e.changedTouches[0]?.clientX||0)-x,dy=(e.changedTouches[0]?.clientY||0)-y;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.4){change(current,dx<0?1:-1)}},{passive:true});
 holder.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();change(current,e.key==='ArrowLeft'?-1:1)}});
 return current;
});
function change(c,step){if(!c.items.length)return;c.index=(c.index+step+c.items.length)%c.items.length;paint(c)}
function paint(c){const item=c.items[c.index],uploaded=!!item;const kitten=c.holder.querySelector('#sittingKitten');c.previous.hidden=c.next.hidden=c.items.length===0;
 c.overlay.hidden=!uploaded;
 if(kitten&&uploaded)kitten.style.visibility='hidden';else if(kitten)kitten.style.removeProperty('visibility');
 if(!uploaded)return;
 c.overlay.querySelector('img').src=item.signed;c.overlay.querySelector('img').alt=item.title;
 c.overlay.querySelector('strong').textContent=item.title;c.overlay.querySelector('.ckstory-upload-note span').textContent=item.note||'A little memory together ♡';c.overlay.classList.remove('show-note');
 const del=c.overlay.querySelector('.ckstory-delete');del.hidden=!user||item.created_by!==user.id;
 del.onclick=async e=>{e.stopPropagation();if(!confirm('Delete “'+item.title+'”?'))return;del.disabled=true;const {error}=await client.from('site_story_photos').delete().eq('id',item.id);if(error){notify(error.message);del.disabled=false;return}await client.storage.from('site-story-photos').remove([item.photo_path]);await load()};
}
function renderAlbum(){controls.forEach(c=>{const currentId=c.items[c.index]?.id;c.items=rows.filter(r=>(r.category||'real_life')===c.category&&r.signed);c.index=Math.max(0,c.items.findIndex(r=>r.id===currentId));paint(c)})}
async function sdk(){if(window.supabase?.createClient)return window.supabase;return await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';s.onload=()=>window.supabase?.createClient?resolve(window.supabase):reject(Error('Supabase unavailable'));s.onerror=()=>reject(Error('Could not load Supabase'));document.head.append(s)})}
async function load(){if(!client||!user)return;const seq=++version;const {data,error}=await client.from('site_story_photos').select('id,title,note,photo_path,created_by,created_at,category').order('created_at',{ascending:false});if(seq!==version)return;if(error){notify('Unable to load photos. Check the Story Photos SQL setup.');return}rows=data||[];for(const row of rows){const {data:link,error:err}=await client.storage.from('site-story-photos').createSignedUrl(row.photo_path,3600);if(seq!==version)return;row.signed=!err?link?.signedUrl:null}renderAlbum();notify('')}
async function connect(){try{const lib=await sdk();client=lib.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});const {data:{user:current}}=await client.auth.getUser();user=current;btn.hidden=!user;if(!user){notify('Sign in to add and view shared pictures.');return}await load();client.auth.onAuthStateChange((_e,session)=>{if(session?.user?.id===user?.id)return;user=session?.user||null;btn.hidden=!user;if(user)queueMicrotask(()=>load());else{version++;rows=[];renderAlbum();notify('Sign in to view shared pictures.')}})}catch(err){notify('Photo connection unavailable: '+err.message)}}
btn.onclick=()=>{if(!user)return;const shade=document.createElement('div');shade.className='ckstory-shade';shade.innerHTML='<form class="ckstory-form"><div class="ckstory-formhead"><div><small>OUR STORY STUDIO</small><h3>Add a memory ♡</h3></div><button type="button" class="ckstory-close" aria-label="Close">×</button></div><label>Album<select name="category"><option value="real_life">♡ Real Life</option><option value="minecraft">⛏ Minecraft</option><option value="games">✦ Other Games</option></select></label><label>Picture<input type="file" accept="image/jpeg,image/png,image/webp" required></label><img class="ckstory-preview" alt="Preview" hidden><label>Title<input name="title" maxlength="100" placeholder="A little moment…" required></label><label>Our note<textarea name="note" maxlength="700" rows="3" placeholder="Tell our story…"></textarea></label><p class="ckstory-feedback" role="status"></p><button class="ckstory-submit" type="submit">Save memory ♡</button></form>';document.body.append(shade);const form=shade.querySelector('form'),file=form.querySelector('input[type=file]'),preview=form.querySelector('img'),feedback=form.querySelector('.ckstory-feedback');form.elements.category.value=album;let objectUrl=null;function close(){if(objectUrl)URL.revokeObjectURL(objectUrl);shade.remove()}shade.querySelector('.ckstory-close').onclick=close;shade.onclick=e=>{if(e.target===shade)close()};file.onchange=()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);const f=file.files[0];if(f){objectUrl=URL.createObjectURL(f);preview.src=objectUrl;preview.hidden=false}else preview.hidden=true};form.onsubmit=async e=>{e.preventDefault();if(!user)return;const f=file.files[0];if(!f||!['image/jpeg','image/png','image/webp'].includes(f.type)){feedback.textContent='Choose a PNG, JPEG or WebP image.';return}if(f.size>10*1024*1024){feedback.textContent='Picture must be under 10 MB.';return}const save=form.querySelector('.ckstory-submit');save.disabled=true;feedback.textContent='Uploading your memory…';const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[f.type];const path=user.id+'/'+crypto.randomUUID()+'.'+ext;const upload=await client.storage.from('site-story-photos').upload(path,f,{contentType:f.type});if(upload.error){feedback.textContent=upload.error.message;save.disabled=false;return}const title=form.elements.title.value.trim(),note=form.elements.note.value.trim();const insert=await client.from('site_story_photos').insert({title,note,category:form.elements.category.value,photo_path:path,created_by:user.id});if(insert.error){await client.storage.from('site-story-photos').remove([path]);feedback.textContent=insert.error.message;save.disabled=false;return}close();await load();}};
connect();
})();