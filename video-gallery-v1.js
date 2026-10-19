/* Cinta Kita Gallery v1 — integrates with the existing site_videos owner-checked system. */
(()=>{'use strict';
const section=document.getElementById('videos'),native=document.getElementById('videoGrid'),manage=document.getElementById('videoManageToggle');
if(!section||!native||document.getElementById('ckvg-app'))return;
const key='ck:gallery:playlists:v1',state={videos:[],owner:false,query:'',sort:'newest',filter:'all',playlist:null,playing:null,queue:[],queueIndex:0,lists:[]};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const button=(label,cls,fn)=>{const b=el('button',cls,label);b.type='button';b.onclick=fn;return b};
const cleanId=id=>String(id||'').replace(/[^A-Za-z0-9_-]/g,'');
const safeLists=()=>{try{const x=JSON.parse(localStorage.getItem(key));return Array.isArray(x)?x.filter(a=>a&&typeof a.name==='string'&&Array.isArray(a.ids)).slice(0,100):[]}catch{return []}};
state.lists=safeLists();
const persist=()=>{try{localStorage.setItem(key,JSON.stringify(state.lists))}catch{toast('Browser storage unavailable; playlist changes may not persist')}};
const byId=id=>state.videos.find(x=>String(x.id)===String(id));
const hasPlaylist=(list,id)=>list.ids.some(x=>String(x)===String(id));
const cover=v=>v?.youtube_id?'https://i.ytimg.com/vi/'+cleanId(v.youtube_id)+'/hqdefault.jpg':'';
const relative=v=>{if(!v?.created_at)return 'Video';const d=new Date(v.created_at);return Number.isNaN(+d)?'Video':d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})};
const app=el('div','ckvg-app');app.id='ckvg-app';app.innerHTML='<div class="ckvg-top"><div class="ckvg-brand"><small>OUR PRIVATE CINEMA</small><h3>Little moments, forever.</h3><p>A place for all of our stories, favorite clips and memories.</p></div><div class="ckvg-count" id="ckvg-count"></div></div><div class="ckvg-toolbar"><div class="ckvg-searchwrap"><span aria-hidden="true">⌕</span><input id="ckvg-search" type="search" placeholder="Search our videos…" aria-label="Search videos"></div><select id="ckvg-sort" aria-label="Sort videos"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="title">Title A–Z</option></select><button type="button" id="ckvg-create">＋ New playlist</button></div><div class="ckvg-shell"><aside class="ckvg-rail" aria-label="Video collections"><div class="ckvg-rail-title">YOUR LIBRARY</div><div id="ckvg-nav"></div><p class="ckvg-localnote">Playlists are saved in this browser until shared storage is enabled.</p></aside><div class="ckvg-main"><div id="ckvg-featured"></div><div class="ckvg-sectionhead"><div><span id="ckvg-kicker">THE COLLECTION</span><h4 id="ckvg-heading">All videos</h4></div><span id="ckvg-resultcount"></span></div><div class="ckvg-grid" id="ckvg-grid"></div></div></div>';
native.after(app);
const nav=app.querySelector('#ckvg-nav'),grid=app.querySelector('#ckvg-grid'),feature=app.querySelector('#ckvg-featured');
const search=app.querySelector('#ckvg-search'),sort=app.querySelector('#ckvg-sort'),header=app.querySelector('#ckvg-heading'),count=app.querySelector('#ckvg-resultcount'),kicker=app.querySelector('#ckvg-kicker');
const badge=app.querySelector('#ckvg-count'),create=app.querySelector('#ckvg-create');
const overlay=el('div','ckvg-overlay');overlay.hidden=true;document.body.append(overlay);
let toastTimer;const toastNode=el('div','ckvg-toast');toastNode.hidden=true;document.body.append(toastNode);
function toast(msg){toastNode.textContent=msg;toastNode.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastNode.hidden=true,3400)}
function stopPlayer(){overlay.hidden=true;overlay.replaceChildren();document.body.classList.remove('ckvg-playeropen');state.playing=null}
function openPlayer(id,queue){const v=byId(id);if(!v)return toast('This video is unavailable');state.queue=queue||state.videos.map(x=>x.id);state.queueIndex=Math.max(0,state.queue.findIndex(x=>String(x)===String(id)));state.playing=String(id);
 overlay.replaceChildren();overlay.hidden=false;document.body.classList.add('ckvg-playeropen');
 const dialog=el('section','ckvg-player');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Playing '+v.title);
 const head=el('header','ckvg-playerhead');const titles=el('div');titles.append(el('small','', 'NOW PLAYING'),el('h3','',v.title));head.append(titles,button('✕ Close','ckvg-close',stopPlayer));dialog.append(head);
 const frame=el('iframe','ckvg-frame');frame.src='https://www.youtube-nocookie.com/embed/'+cleanId(v.youtube_id)+'?autoplay=1&rel=0';frame.title=v.title;frame.allow='accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share';frame.referrerPolicy='strict-origin-when-cross-origin';frame.allowFullscreen=true;dialog.append(frame);
 const foot=el('footer','ckvg-playerfoot');const about=el('p','',v.description||'One of our little memories ♡');foot.append(about);
 const controls=el('div','ckvg-playercontrols');controls.append(button('← Previous','',()=>move(-1)),button('Next →','',()=>move(1)));foot.append(controls);dialog.append(foot);overlay.append(dialog);
 overlay.onclick=e=>{if(e.target===overlay)stopPlayer()};
 }
 function move(n){const next=state.queue[state.queueIndex+n];if(next)openPlayer(next,state.queue);else toast('No more videos in this collection')}
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)stopPlayer()});
 function currentList(){return state.lists.find(x=>x.id===state.playlist)}
 function visibleVideos(){let out=[...state.videos];const list=currentList();if(list){out=list.ids.map(byId).filter(Boolean)}else if(state.filter==='recent'){out=out.slice(0,6)}const q=state.query.trim().toLowerCase();if(q)out=out.filter(x=>(x.title+' '+(x.description||'')).toLowerCase().includes(q));if(!list){if(state.sort==='title')out.sort((a,b)=>a.title.localeCompare(b.title));else out.sort((a,b)=>(new Date(b.created_at)-new Date(a.created_at))*(state.sort==='oldest'?-1:1))}return out}
 function makeMenu(video){const box=el('div','ckvg-menu');const trigger=button('＋ Save','ckvg-savelink',()=>{menu.hidden=!menu.hidden});const menu=el('div','ckvg-menuitems');menu.hidden=true;
 const addActions=()=>{menu.replaceChildren();menu.append(el('small','','SAVE TO PLAYLIST'));if(!state.lists.length)menu.append(button('＋ Create playlist','',()=>{menu.hidden=true;createList(video.id)}));
 state.lists.forEach(list=>menu.append(button((hasPlaylist(list,video.id)?'✓ ':'＋ ')+list.name,'',()=>{if(hasPlaylist(list,video.id))list.ids=list.ids.filter(x=>String(x)!==String(video.id));else list.ids.push(video.id);persist();addActions();toast('Playlist updated ♡')})))};
 addActions();box.append(trigger,menu);document.addEventListener('pointerdown',e=>{if(!box.contains(e.target))menu.hidden=true},{passive:true});return box}
 function card(v,queue){const c=el('article','ckvg-card');const a=button('','ckvg-cover',()=>openPlayer(v.id,queue));const image=el('img');image.src=cover(v);image.alt='Thumbnail for '+v.title;image.loading='lazy';a.append(image,el('span','ckvg-play','▶'));
 const body=el('div','ckvg-cardbody');body.append(el('span','ckvg-date',relative(v)),el('h5','',v.title),el('p','',v.description||'Watch our story ♡'));body.append(makeMenu(v));c.append(a,body);return c}
 function render(){const out=visibleVideos(),list=currentList(),all=state.videos;
 badge.textContent=all.length+' VIDEO'+(all.length===1?'':'S')+' IN OUR COLLECTION';
 header.textContent=list?list.name:state.filter==='recent'?'Recently added':'All videos';kicker.textContent=list?'YOUR PLAYLIST':state.filter==='recent'?'FRESH FROM THE STUDIO':'THE COLLECTION';count.textContent=out.length+' video'+(out.length===1?'':'s');
 nav.replaceChildren();nav.append(button('▦  All videos'+'   '+all.length,'ckvg-navbutton'+(!list&&state.filter==='all'?' active':''),()=>{state.playlist=null;state.filter='all';render()}),button('✧  Recently added','ckvg-navbutton'+(!list&&state.filter==='recent'?' active':''),()=>{state.playlist=null;state.filter='recent';render()}));
 nav.append(el('div','ckvg-navcaption','PLAYLISTS'));
 state.lists.forEach(l=>{const row=el('div','ckvg-listrow');row.append(button('♫  '+l.name+'   '+l.ids.length,'ckvg-navbutton'+(list===l?' active':''),()=>{state.playlist=l.id;state.filter='all';render()}),button('⋯','ckvg-listsettings',()=>manageList(l)));nav.append(row)});
 grid.replaceChildren();if(!out.length){const empty=el('div','ckvg-empty');empty.append(el('div','ckvg-emptysymbol','♡'),el('h5','',state.query?'Nothing matches your search':list?'This playlist is empty':'Our next video is coming soon'),el('p','',list?'Add a video using its Save button.':'Try another search or add a new video.'));grid.append(empty)}
 const ids=out.map(x=>x.id);out.forEach(v=>grid.append(card(v,ids)));
 feature.replaceChildren();
 if(!list&&!state.query&&all.length){const v=all[0],hero=el('div','ckvg-hero');const visual=el('div','ckvg-herovisual');visual.style.backgroundImage='linear-gradient(90deg,#111015f2 4%,#11101580 45%,#11101536),url("'+cover(v)+'")';const body=el('div','ckvg-herocopy');body.append(el('span','ckvg-herolabel','✦ FEATURED MEMORY'),el('h4','',v.title),el('p','',v.description||'A little moment, worth keeping.'));body.append(button('▶ Watch now','ckvg-watch',()=>openPlayer(v.id,all.map(x=>x.id))));hero.append(visual,body);feature.append(hero)}
 create.hidden=!state.owner;
 }
 function ask(message,value=''){const r=prompt(message,value);return r===null?null:r.trim().slice(0,70)}
 function createList(videoId){const name=ask('New playlist name');if(!name)return;const l={id:crypto.randomUUID?crypto.randomUUID():'p'+Date.now(),name,ids:videoId?[videoId]:[]};state.lists.push(l);persist();state.playlist=l.id;state.filter='all';render();toast('Playlist created ♡')}
 function manageList(l){const choice=prompt('Playlist: '+l.name+'\n1 — Rename\n2 — Delete playlist\n3 — Move a video up/down (open playlist first)','1');if(choice==='1'){const name=ask('Rename playlist',l.name);if(name){l.name=name;persist();render()}}else if(choice==='2'){if(confirm('Delete playlist “'+l.name+'”? Videos will remain in your library.')){state.lists=state.lists.filter(x=>x.id!==l.id);if(state.playlist===l.id)state.playlist=null;persist();render()}}else if(choice==='3'){if(!l.ids.length)return toast('Playlist is empty');const lines=l.ids.map((id,i)=>(i+1)+'. '+(byId(id)?.title||'Missing video')).join('\n');const number=Number(prompt('Choose a video number:\n'+lines));if(!Number.isInteger(number)||number<1||number>l.ids.length)return;const dir=prompt('Move “'+(byId(l.ids[number-1])?.title||'video')+'” up or down?','up');const index=number-1,next=index+(dir==='down'?1:dir==='up'?-1:0);if(next>=0&&next<l.ids.length&&index!==next){[l.ids[index],l.ids[next]]=[l.ids[next],l.ids[index]];persist();render()}}}
 search.oninput=()=>{state.query=search.value;render()};sort.onchange=()=>{state.sort=sort.value;render()};create.onclick=()=>createList();
 window.addEventListener('ck:videos',e=>{if(!e.detail)return;state.videos=Array.isArray(e.detail.videos)?e.detail.videos.filter(v=>v?.published&&v?.youtube_id):[];state.owner=!!e.detail.owner;render()});
 if(window.__ckGallerySnapshot){const x=window.__ckGallerySnapshot;state.videos=x.videos||[];state.owner=!!x.owner}
 native.classList.add('ckvg-original-hidden');render();
})();