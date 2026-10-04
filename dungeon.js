/* Cinta Kita v88 — sign-in recovery patch. Complete standalone dungeon client. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id),audio=window.CintaAudio||{enabled:false,volume:.45,play(){},chord(){},setEnabled(){},setVolume(){},unlock(){}};
 const client=window.supabase?.createClient('https://djhhwdjgokzofkaemrpf.supabase.co','sb_publishable_74Fr4c8T4OIKBgXED-sgsg_iUPBviG0')||null;
 const stages=[['Moss Gate','The lanterns lead beneath the roots.','⚔'],['Guard Hall','Steel and stone guard the path ahead.','◇'],['Lantern Camp','A quiet moment before the deeper halls.','♨'],['Crossroads','Two sentries. Choose your target carefully.','⚔'],['Forgotten Treasury','A relic waits beneath the dust.','✦'],['Royal Sentries','The crown’s last defenders stand together.','⚔'],['The Hollow Throne','Break the crown. Bring the lanterns home.','♛']];
 let user=null,run=null,view=null,selectedClass='knight',enemyTarget=null,allyTarget=null,busy=false,playing=false,loading=false,generation=0,epoch=0,channel=null,timer=null,pending=null,authGeneration=0;
 let speed=1,motion=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 try{const pref=JSON.parse(localStorage.getItem('cinta88Settings')||'{}');if([.65,1,1.25].includes(pref.speed))speed=pref.speed;if(typeof pref.motion==='boolean')motion=pref.motion;}catch{}
 document.documentElement.dataset.motion=String(motion);$('battleSpeed').value=String(speed);$('motion').checked=motion;$('volume').value=String(audio.volume*100);
 function saveSettings(){try{localStorage.setItem('cinta88Settings',JSON.stringify({speed,motion}));}catch{}}
 function node(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
 const locked=()=>busy||playing;
 const modern=r=>r?.state?.format===88;
 const enemies=r=>modern(r)?r.state.enemies:(r?.state.enemy?[{...r.state.enemy,id:'e1',type:r.state.room===3?'king':r.state.room===2?'guard':'scout',shield:0,poison:0,stun:0,exposed:false}]:[]);
 const maxStages=r=>modern(r)?7:3;
 const statusLabel=r=>({lobby:'Ready to begin',active:'In battle',room_clear:modern(r)&&[3,5].includes(r.state.room)?'Recovery stop':'Stage cleared',won:'Complete',lost:'Party fallen'})[r.status]||'Adventure';
 function feedback(text='',error=false){$('feedback').textContent=text;$('feedback').hidden=!text;$('feedback').dataset.error=String(error);if(error)audio.play('error');}
 function errorText(e){if(['42P01','42883','PGRST202','PGRST205'].includes(e?.code))return 'The v88 dungeon database update is needed. Run the complete supplied SQL file in Supabase, then refresh.';return e?.message||'Connection interrupted. Please try again.';}
 function stopLive(){if(channel){client?.removeChannel(channel);channel=null;}clearInterval(timer);timer=null;}
 function remember(){try{if(run)localStorage.setItem(`cintaDungeonRun:${user.id}`,run.id);}catch{}}
 function resetPlayback(){epoch++;playing=false;view=null;pending=null;$('phase').hidden=true;}
 function showUser(next){
  if((next?.id||null)===(user?.id||null)&&user)return;
  user=next;generation++;busy=false;run=null;enemyTarget=null;allyTarget=next?.id||null;resetPlayback();stopLive();
  $('authGate').hidden=!!user;$('game').hidden=!user;$('signOut').hidden=!user;
  $('authFeedback').textContent='Sign in with the same account you use on Cinta Kita.';
  $('connection').textContent=user?'Online':'Sign in to explore';render();if(user){listRuns();subscribe();}
 }
 async function initializeAuth(){
  const status=$('authFeedback');
  if(!client){status.textContent='Supabase did not load. Check the Supabase script and reload.';return;}
  let initialized=false;
  const initialTimer=setTimeout(()=>{
   if(initialized)return;
   initialized=true;
   status.textContent='Session check timed out. You can still sign in below. If the button does not respond, check your internet connection.';
   $('connection').textContent='Session check timed out';
  },10000);
  const finishInitial=(session)=>{
   if(initialized)return;
   initialized=true;clearTimeout(initialTimer);
   try{showUser(session?.user||null);}catch(error){status.textContent='Could not open the dungeon: '+(error?.message||'unknown error');}
  };
  // An explicit session check works even if INITIAL_SESSION is delayed.
  try{
   const {data,error}=await Promise.race([
    client.auth.getSession(),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('Session check timed out')),9000))
   ]);
   if(error)throw error;
   finishInitial(data?.session);
  }catch(error){
   finishInitial(null);
   status.textContent='You can sign in below. Session check: '+(error?.message||'unavailable');
  }
 }
 $('loginForm').onsubmit=async event=>{
  event.preventDefault();
  if(!client){$('authFeedback').textContent='Supabase did not load. Reload the page.';return;}
  const button=$('signIn');button.disabled=true;$('authFeedback').textContent='Signing in…';
  try{
   const {data,error}=await Promise.race([
    client.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value}),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('Sign-in timed out. Check your connection and try again.')),16000))
   ]);
   if(error)throw error;
   $('password').value='';showUser(data.user);
  }catch(error){$('authFeedback').textContent='Sign-in failed: '+(error?.message||'Please try again.');}
  finally{button.disabled=false;}
 };
 $('signOut').onclick=async()=>{if(!client)return;try{const {error}=await client.auth.signOut();if(error)throw error;showUser(null);}catch(e){feedback(errorText(e),true);}};
 function subscribe(){
  stopLive();if(!user)return;const token=generation;
  const subscription=run?{event:'UPDATE',schema:'public',table:'cinta_dungeon_runs',filter:`id=eq.${run.id}`}:{event:'*',schema:'public',table:'cinta_dungeon_runs'};
  channel=client.channel(`cinta88-${run?.id||user.id}-${token}`).on('postgres_changes',subscription,()=>{if(token!==generation)return;run?fetchRun():listRuns();}).subscribe(status=>{if(token===generation)$('connection').textContent=status==='SUBSCRIBED'?'Live co-op':'Online · syncing';});
  timer=setInterval(()=>{if(!document.hidden&&!locked())run?fetchRun():listRuns();},run?3500:6000);
 }
 async function listRuns(){
  if(!user||run||locked())return;const uid=user.id,token=generation;
  $('openRuns').textContent='Looking for expeditions…';$('savedRuns').textContent='Loading adventures…';
  try{
   // Query owned adventures separately so they are not displaced by public lobbies.
   const [owned,available]=await Promise.all([
    client.from('cinta_dungeon_runs').select('*').contains('members',[uid]).order('updated_at',{ascending:false}).limit(24),
    client.from('cinta_dungeon_runs').select('*').in('status',['lobby','active','room_clear']).order('updated_at',{ascending:false}).limit(24)
   ]);
   if(token!==generation||uid!==user?.id||run)return;if(owned.error)throw owned.error;if(available.error)throw available.error;
   $('openRuns').replaceChildren();$('savedRuns').replaceChildren();
   for(const r of owned.data||[])addRun(r,$('savedRuns'),true);
   for(const r of available.data||[])if(!r.members.includes(uid))addRun(r,$('openRuns'),false);
   if(!$('openRuns').childElementCount)$('openRuns').append(node('p','No open expeditions yet. Start one and invite a friend.','muted'));
   if(!$('savedRuns').childElementCount)$('savedRuns').append(node('p','Your adventures will appear here.','muted'));
  }catch(e){if(token===generation){$('openRuns').textContent='Could not load expeditions.';$('savedRuns').textContent='Could not load saved adventures.';feedback(errorText(e),true);}}
 }
 function addRun(r,container,member){
  const row=node('div',undefined,'run-entry'),copy=node('div'),button=node('button',member?'Resume':'Join');button.type='button';
  copy.append(node('strong',`${statusLabel(r)} · Stage ${r.state.room}/${maxStages(r)}`),node('small',`${r.state.players.map(p=>p.name).join(', ')} · ${r.members.length} ${r.members.length===1?'adventurer':'adventurers'}${modern(r)?'':' · Classic adventure'}`));
  button.onclick=()=>{if(locked())return;if(member)enter(r);else request('cinta_dungeon_join_v88',{p_code:r.join_code,p_class:selectedClass});};row.append(copy,button);container.append(row);
 }
 function enter(r){generation++;resetPlayback();run=r;enemyTarget=null;allyTarget=user.id;feedback();remember();render();subscribe();fetchRun();$('stageTitle').scrollIntoView({block:'start',behavior:motion?'smooth':'auto'});}
 async function fetchRun(){
  if(!run||!user||loading||locked())return;const id=run.id,uid=user.id,token=generation;loading=true;
  try{const {data,error}=await client.from('cinta_dungeon_runs').select('*').eq('id',id).maybeSingle();if(token!==generation||uid!==user?.id||run?.id!==id)return;if(error)throw error;if(data){await ingest(data);$('syncStatus').textContent='Progress saved';}else{leave();feedback('This adventure is no longer available.',true);}}
  catch(e){if(token===generation){$('syncStatus').textContent='Reconnecting…';feedback(errorText(e),true);}}
  finally{loading=false;}
 }
 async function ingest(data,animate=true){
  if(!data||!data.members?.includes(user?.id))return;
  if(playing){if(!pending||Number(data.version)>Number(pending.version))pending=data;return;}
  if(run?.id===data.id&&Number(data.version)<Number(run.version))return;
  const before=run;run=data;remember();
  if(animate&&!document.hidden&&modern(data)&&before?.id===data.id&&Number(data.version)===Number(before.version)+1&&data.state.last_event?.version==data.version&&data.state.last_event.phases.length){await playback(before,data);}
  else render();
 }
 async function request(name,args){
  if(locked()||!user)return;const uid=user.id,token=generation;busy=true;render();feedback();
  try{
   let response;
   for(let attempt=0;attempt<3;attempt++){
    response=await client.rpc(name,args);if(token!==generation||uid!==user?.id)return;
    if(!response.error||!response.error.message?.startsWith('The adventure changed')||attempt===2)break;
    const {data,error}=await client.from('cinta_dungeon_runs').select('*').eq('id',args.p_run).maybeSingle();if(token!==generation||uid!==user?.id)return;if(error||!data)break;
    await ingest(data,false);
    if(data.status!=='active'&&['attack','skill','defend','focus','mark','protect','heal','revive','ultimate','combo'].includes(args.p_action)){response={data,error:null};break;}
    args={...args,p_version:data.version};
   }
   if(response.error)throw response.error;
   const data=Array.isArray(response.data)?response.data[0]:response.data;
   if(data.id!==run?.id){busy=false;enter(data);audio.play('door');}
   else await ingest(data);
  }catch(e){if(token===generation){feedback(errorText(e),true);}}
  finally{if(token===generation){busy=false;render();if(pending){const latest=pending;pending=null;await ingest(latest);}fetchRun();}}
 }
 function command(action){
  if(!run||locked())return;audio.unlock();
  const target=['heal','revive','protect'].includes(action)?allyTarget:enemyTarget;
  request(modern(run)?'cinta_dungeon_action_v88':'cinta_dungeon_command',modern(run)?{p_run:run.id,p_action:action,p_target:target||user.id,p_version:run.version}:{p_run:run.id,p_action:action,p_version:run.version});
 }
 function leave(){if(locked())return;generation++;resetPlayback();run=null;render();feedback();subscribe();listRuns();window.scrollTo({top:0,behavior:motion?'smooth':'auto'});}
 function intent(e,r){
  if(!modern(r))return {text:r.state.room===3&&r.state.round%3===0?`${e.attack+2} damage · whole party`:`${e.attack} damage · acting hero`,danger:r.state.room===3&&r.state.round%3===0};
  if(e.hp<=0)return {text:'Defeated',danger:false};if(e.stun>0)return {text:'Staggered · response skipped',danger:false};
  if(e.type==='guard'&&r.state.round%3===2)return {text:'Fortify · +8 shield',danger:false};
  const heavy=r.state.round%3===0,furious=e.type==='king'&&e.hp*2<e.max_hp,damage=Math.max(1,e.attack+(heavy?2:0)+(furious?2:0)-(e.weakened>0?2:0));
  return {text:e.type==='king'&&heavy?`Royal Sweep · ${damage} to all`:e.type==='scout'&&heavy?`Venom Cut · ${damage} + poison`:`Strike · ${damage}${furious?' · enraged':''}`,danger:heavy||furious};
 }
 function sprite(type){const n=node('div',undefined,`sprite ${type}`);n.setAttribute('aria-hidden','true');return n;}
 function bar(hp,max){const b=node('div',undefined,'bar'),fill=node('span');fill.style.width=`${Math.max(0,Math.min(100,100*hp/max))}%`;b.append(fill);return b;}
 function fighter(p,enemy=false,r=run){
  const card=node(enemy?'button':'div',undefined,`fighter ${enemy?'enemy':'ally'}`);card.dataset.id=p.id;card.dataset.type=p.type||p.class;card.dataset.class=p.class||'';card.dataset.down=String(p.hp<=0);
  if(enemy){card.type='button';card.dataset.selected=String(p.id===enemyTarget);card.disabled=locked()||p.hp<=0;card.setAttribute('aria-pressed',String(p.id===enemyTarget));card.setAttribute('aria-label',`Select ${p.name}, ${p.hp} of ${p.max_hp} HP`);card.onclick=()=>{enemyTarget=p.id;audio.play('select');render();};}
  else{card.dataset.current=String(p.id===user.id);}
  const plate=node('div',undefined,'nameplate');plate.append(node('h3',p.name),bar(p.hp,p.max_hp),node('p',`${p.hp} / ${p.max_hp} HP${!enemy&&p.id===user.id?' · YOU':''}`));
  if(!enemy&&modern(r))plate.append(node('div',`Focus ${'◆'.repeat(p.focus||0)}${'◇'.repeat(4-(p.focus||0))}`,'pips'));
  if(p.weakened>0){const n=node('p',`Weakened · ${p.weakened}`);n.title='Deals 2 less damage on its next attacking responses.';plate.append(n);}
  const chips=node('div',undefined,'status-chips');if(p.shield>0){const n=node('span',`${p.shield} shield`);n.title='Shields absorb direct damage. Poison bypasses shields.';chips.append(n);}if(p.poison>0){const n=node('span',`Poison ${p.poison}`);n.title=enemy?'Takes 3 damage before enemy responses. Ignores shields.':'Takes 2 damage after acting. Healing potions cure poison.';chips.append(n);}if(p.exposed){const n=node('span','Exposed');n.title='The next hit deals 5 extra damage.';chips.append(n);}if(p.stun>0)chips.append(node('span','Staggered'));if(p.hp<=0)chips.append(node('span','Down'));if(chips.childElementCount)plate.append(chips);
  card.append(plate,sprite(enemy?p.type:p.class));
  if(enemy){const next=intent(p,r),label=node('div',next.text,'intent');label.dataset.danger=String(next.danger);card.append(label);}
  return card;
 }
 function render(){
  const r=view||run,lock=locked();$('lobby').hidden=!!r;$('expedition').hidden=!r;
  $('create').disabled=lock;$('joinForm').querySelector('button').disabled=lock;$('refresh').disabled=lock;$('joinCode').disabled=lock;
  for(const b of $('classChoices').querySelectorAll('button'))b.disabled=lock;
  if(!r)return;
  const st=r.state,isModern=modern(r),me=st.players.find(p=>p.id===user?.id),es=enemies(r),alive=es.filter(e=>e.hp>0),room=st.room;
  if(!alive.some(e=>e.id===enemyTarget))enemyTarget=alive[0]?.id||null;
  if(!isModern||!st.players.some(p=>p.id===allyTarget))allyTarget=me?.id||st.players[0].id;
  const stage=isModern?stages[room-1]:[`Classic adventure · Room ${room}`,'Your earlier adventure is still available.','⚔'];
  $('stageTitle').textContent=stage[0];$('stageSubtitle').textContent=stage[1];$('chapterLabel').textContent=isModern?'THE HOLLOW CROWN · SEVEN-STAGE EXPEDITION':'CLASSIC GOBLIN HOLLOW';$('arena').dataset.room=String(room);$('sceneLabel').textContent=r.status==='lobby'?'Your adventure begins here':`${stage[0]} · ${statusLabel(r)}`;
  $('route').replaceChildren();
  for(let i=0;i<maxStages(r);i++){const n=node('div',undefined,'route-node');n.dataset.current=String(i===room-1);n.dataset.done=String(i<room-1||r.status==='won');if(i===room-1)n.setAttribute('aria-current','step');n.append(node('span',i<room-1?'✓':isModern?stages[i][2]:'⚔'),node('small',isModern?stages[i][0]:`Room ${i+1}`));$('route').append(n);}
  $('partyLevel').textContent=isModern?`Party Lv. ${st.level} · ${st.xp} XP`:'Classic expedition';$('treasure').textContent=`${st.coins} party coins`;$('focusSummary').textContent=isModern?`Your Focus: ${me?.focus||0}/4`:`Skills: ${me?.skills||0}`;$('comboSummary').textContent=isModern?`United Strike: ${st.combo}/6`:'';
  $('backLobby').disabled=lock;
  const featured=[...st.players].sort((a,b)=>Number(b.id===user.id)-Number(a.id===user.id)).slice(0,2);$('heroes').replaceChildren(...featured.map(p=>fighter(p,false,r)));$('enemies').replaceChildren(...es.slice(0,2).map(p=>fighter(p,true,r)));
  $('roster').replaceChildren();$('partyCount').textContent=String(st.players.length);
  for(const p of st.players){const entry=node('div',undefined,'roster-entry');entry.append(node('strong',`${p.name}${p.id===user.id?' · You':''}`),node('p',`${p.class==='knight'?'Knight':'Ranger'} · ${p.hp} / ${p.max_hp} HP`),bar(p.hp,p.max_hp),node('p',isModern?`${p.focus||0} Focus · ${p.potions} potions · ${p.shield||0} shield${p.poison?' · Poisoned':''}`:`${p.potions} potions · ${p.skills} skills`));$('roster').append(entry);}
  $('journal').replaceChildren(...st.log.map(t=>node('li',t)));$('journal').scrollTop=$('journal').scrollHeight;
  const options=st.players.map(p=>{const o=node('option',`${p.name}${p.id===user.id?' (you)':''} · ${p.hp}/${p.max_hp} HP`);o.value=p.id;return o;});$('allyTarget').replaceChildren(...options);$('allyTarget').value=allyTarget;$('allyTarget').disabled=lock||!isModern;
  const selected=es.find(e=>e.id===enemyTarget),ally=st.players.find(p=>p.id===allyTarget);$('selectedEnemy').textContent=selected?.name||'None';
  $('combatDock').hidden=r.status!=='active';$('sceneEvent').hidden=r.status==='active';$('heroes').hidden=r.status==='lobby'||(isModern&&[3,5].includes(room));$('enemies').hidden=r.status==='lobby'||(isModern&&[3,5].includes(room));
  if(!$('sceneEvent').hidden){$('sceneEvent').replaceChildren(node('div',r.status==='lobby'?'✦':isModern&&room===3?'♨':isModern&&room===5?'✧':r.status==='lost'?'◇':'♛','event-icon'),node('h2',r.status==='lobby'?'Ready for a little adventure?':isModern&&room===3?'A moment by the lanterns':isModern&&room===5?'A gift from the old kingdom':r.status==='lost'?'The lanterns grow dim':'A path opens'),node('p',r.status==='lobby'?'Enter alone or invite other adventurers.':isModern&&room===3?'Rest, practice, or gather supplies. Your choice benefits the entire party.':isModern&&room===5?'Choose a relic for this expedition. Every party member shares its benefit.':r.status==='lost'?'Your saved story ends here. Start a fresh expedition when you are ready.':'Your party has earned a moment to recover.'));}
  $('turnPrompt').textContent=playing?'The battle unfolds…':busy?'Sending your action…':me?.hp>0?'Choose your next move':'Your adventurer is down';
  const danger=alive.find(e=>intent(e,r).danger);$('tacticalTip').textContent=me?.hp<=0?'An ally can revive you. Your adventure remains saved.':danger?`${danger.name} is preparing a dangerous response. ${me?.class==='knight'?'Guard, protect an ally, or stagger it with Shield Break.':'Guard, protect an ally, or weaken the attacker with Venom Arrow.'}`:me?.class==='ranger'&&selected?.poison>0&&me.focus<2?'The poison is working. Guard to rebuild Focus while the enemy takes poison damage.':selected?.shield>0?(me?.class==='knight'?'This enemy has a shield. Shield Break removes it and skips its next response.':'Venom Arrow bypasses this shield, poisons the enemy, and weakens its next strikes.'):isModern?'Attack to rebuild Focus. Expose a target before a strong hit, or save six combo points for United Strike.':'Choose an action. The enemy responds after your move.';
  $('skillName').textContent=isModern?(me?.class==='knight'?'Shield Break':'Venom Arrow'):(me?.class==='knight'?'Power Strike':'Aimed Shot');$('ultimateName').textContent=me?.class==='knight'?'Crescent Cleave':'Arrow Storm';
  const canAct=r.status==='active'&&me?.hp>0&&!lock;
  for(const b of document.querySelectorAll('[data-action]')){
   const a=b.dataset.action;b.hidden=!isModern&&['focus','mark','protect','ultimate','combo'].includes(a);
   const cost=a==='skill'?2:a==='mark'?1:a==='ultimate'?3:0;
   b.disabled=!canAct||(['attack','skill','mark'].includes(a)&&!selected)||(isModern&&me.focus<cost)||(!isModern&&a==='skill'&&me.skills<=0)||(a==='combo'&&st.combo<6)||(['heal','revive'].includes(a)&&me.potions<=0)||(a==='heal'&&(!ally||ally.hp<=0||(ally.hp>=ally.max_hp&&!ally.poison)))||(a==='revive'&&(!ally||ally.hp>0))||(a==='protect'&&(!ally||ally.hp<=0));
   if(a==='attack')b.querySelector('small').textContent=`${(me?.class==='knight'?9:8)+(me?.boost||0)} damage${isModern?' · +1 Focus':''}`;
   if(a==='skill')b.querySelector('small').textContent=isModern?me?.class==='knight'?'15 + power · break shield · 2 Focus':'12 + power · poison & weaken · 2 Focus':`${me?.class==='knight'?15:17} damage · ${me?.skills||0} charges`;
   if(a==='skill')b.title=isModern?(me?.class==='knight'?'Removes the shield, deals 15 plus attack power, and skips the enemy’s next response. Costs 2 Focus.':'Deals 12 plus attack power through shields, applies 3 poison ticks, and reduces the next two strikes by 2 damage. Costs 2 Focus.'):'Use one skill charge.';
   if(a==='defend')b.querySelector('small').textContent=isModern?'12 shield · +1 Focus':'Reduce the response by half';
   if(a==='heal')b.querySelector('small').textContent=isModern?'Restore 18 HP · cure poison':'Restore 16 HP · 1 potion';
   if(a==='revive')b.querySelector('small').textContent=isModern?'Restore 16 HP · 1 potion':'Revive a fallen ally · 12 HP';
   if(a==='combo')b.dataset.ready=String(st.combo>=6);
  }
  $('supplies').textContent=me?`${me.potions} potions · ${me.hp}/${me.max_hp} HP${isModern?` · +${me.boost||0} attack power`:''}`:'';
  $('stageChoices').hidden=!['lobby','room_clear'].includes(r.status);$('choiceButtons').replaceChildren();
  if(!$('stageChoices').hidden){
   const camp=isModern&&room===3,cache=isModern&&room===5;
   $('choiceEyebrow').textContent=camp?'RECOVERY STOP':cache?'RELIC DISCOVERED':'THE JOURNEY CONTINUES';$('choiceTitle').textContent=r.status==='lobby'?'Enter when you are ready':camp?'Choose your camp activity':cache?'Choose a party relic':'Stage cleared';$('choiceDescription').textContent=camp||cache?'Any party member can choose. The benefit applies to everyone, and the expedition continues.':'Continue at your own pace. Other players can join along the way.';
   const choices=r.status==='lobby'?[['start','Enter the dungeon','Begin your expedition.']]:camp?[['rest','Rest by the fire','Restore 18 HP, fill Focus, and cure poison.'],['train','Practice together','Gain +1 attack power for this expedition.'],['stock','Gather supplies','Every player receives two potions.']]:cache?[['relic_power','Ember Fang','Every player gains +2 attack power.'],['relic_vitality','Heartstone','Every player gains +8 maximum HP.'],['relic_supplies','Alchemist Pouch','Every player receives two potions.']]:[['next','Continue onward',isModern?'The next stage awaits.':'Rest and enter the next room.']];
   for(const [a,title,desc] of choices){const b=node('button');b.type='button';b.dataset.choice=a;b.disabled=lock;b.append(node('strong',title),node('small',desc));b.onclick=()=>command(a);$('choiceButtons').append(b);}
  }
  $('result').hidden=!['won','lost'].includes(r.status);if(!$('result').hidden){$('resultTitle').textContent=r.status==='won'?'The Hollow Crown has fallen':'A brave attempt';$('resultDescription').textContent=r.status==='won'?'The lanterns shine again. Your party’s story is saved.':'Gather your party and try a new path through the halls.';$('resultStats').replaceChildren();for(const [value,label] of [[st.coins,'Party coins'],[isModern?st.turns:'—','Actions'],[isModern?st.level:1,'Party level']]){const n=node('span');n.append(node('strong',String(value)),node('small',label));$('resultStats').append(n);}}
  $('inviteCode').value=r.join_code;
 }
 async function playback(before,after){
  const token=generation,playEpoch=++epoch;playing=true;const valid=()=>token===generation&&playEpoch===epoch&&user&&run?.id===after.id;
  const wait=ms=>new Promise(resolve=>setTimeout(()=>resolve(valid()),ms*speed));
  const phases=after.state.last_event.phases;let previous={players:before.state.players,enemies:enemies(before)};
  view={...after,status:'active',state:{...before.state,players:previous.players,enemies:previous.enemies}};render();
  function label(text,kind){$('phase').hidden=false;$('phase').textContent=text;$('phase').dataset.kind=kind;}
  try{
   const actor=before.state.players.find(p=>p.id===phases[0].actor);label(actor?`${actor.name} prepares a move…`:'The next move begins…','hero');
   if(!await wait(280))return;
   for(const p of phases){
    if(!valid())return;
    if(p.kind==='enemy'){const e=previous.enemies.find(e=>e.id===p.actor);label(`${e?.name||'The enemy'} prepares its response…`,'enemy');if(!await wait(450))return;}
    view={...after,status:p.kind==='victory'?after.status:p.kind==='defeat'?'lost':'active',state:{...after.state,round:before.state.round,players:p.players,enemies:p.enemies,log:before.state.log}};render();label(p.message,p.kind);animatePhase(previous,p);previous=p;
    if(!await wait(p.kind==='poison'?350:p.kind==='victory'?750:600))return;
   }
  }finally{if(playEpoch===epoch){playing=false;view=null;$('phase').hidden=true;render();if(pending){const latest=pending;pending=null;await ingest(latest);}if(!busy)fetchRun();}}
 }
 function animatePhase(old,p){
  const cards=[...$('arena').querySelectorAll('.fighter')],card=id=>cards.find(n=>n.dataset.id===id);
  const move=(id,kind)=>{if(!motion)return;const image=card(id)?.querySelector('.sprite');if(image){image.dataset.motion=kind;setTimeout(()=>{if(image.isConnected)delete image.dataset.motion;},650);}};
  const number=(id,text,positive)=>{const target=card(id);if(!target)return;const n=node('span',text,'floating-number');n.dataset.positive=String(positive);target.append(n);setTimeout(()=>n.remove(),900);};
  let damaged=false;
  for(const unit of [...p.players,...p.enemies]){
   const prev=[...old.players,...old.enemies].find(x=>x.id===unit.id);if(!prev)continue;const delta=unit.hp-prev.hp,shield=(unit.shield||0)-(prev.shield||0);
   if(delta){number(unit.id,delta>0?`+${delta}`:String(delta),delta>0);move(unit.id,delta>0?'heal':'hurt');if(delta<0)damaged=true;}
   else if(shield){number(unit.id,`${shield>0?'+':''}${shield} shield`,shield>0);move(unit.id,'guard');}
  }
  const acting=p.players.find(x=>x.id===p.actor);
  if(['attack','skill','ultimate','combo'].includes(p.kind)){move(p.actor,'attack');audio.play(p.kind==='combo'?'combo':p.kind==='skill'||p.kind==='ultimate'?'skill':acting?.class==='ranger'?'arrow':'sword');if(p.kind==='combo'||p.kind==='ultimate')audio.chord('combo');if(acting?.class==='ranger'&&motion){const arrow=node('div',undefined,'projectile');$('particles').append(arrow);setTimeout(()=>arrow.remove(),450);}}
  else if(p.kind==='enemy'){move(p.actor,'enemy');audio.play(damaged?'enemy':'shield');}
  else if(['heal','revive'].includes(p.kind)){audio.play(p.kind);audio.chord('heal');move(p.actor,'heal');}
  else if(['defend','protect'].includes(p.kind)){audio.play('shield');move(p.actor,'guard');}
  else if(p.kind==='focus'||p.kind==='mark'){audio.play('focus');audio.chord('focus');move(p.actor,'ready');}
  else if(p.kind==='poison')audio.play('poison',.65);
  else if(p.kind==='victory'){audio.play(afterWon()?'victory':'loot');audio.chord('victory');}
  else if(p.kind==='defeat')audio.play('defeat');
  if(damaged&&p.kind!=='poison'){setTimeout(()=>audio.play('hit',.65),90);if(motion){$('arena').dataset.impact='true';setTimeout(()=>delete $('arena').dataset.impact,260);const flash=node('div',undefined,'battle-flash');$('particles').append(flash);setTimeout(()=>flash.remove(),500);}}
 }
 function afterWon(){return run?.status==='won';}
 for(const b of document.querySelectorAll('[data-action]'))b.onclick=()=>command(b.dataset.action);
 for(const b of $('classChoices').querySelectorAll('button'))b.onclick=()=>{selectedClass=b.dataset.class;for(const n of $('classChoices').querySelectorAll('button'))n.setAttribute('aria-pressed',String(n===b));audio.play('select');};
 $('allyTarget').onchange=()=>{allyTarget=$('allyTarget').value;audio.play('select');render();};
 $('create').onclick=()=>request('cinta_dungeon_create_v88',{p_class:selectedClass});$('joinForm').onsubmit=e=>{e.preventDefault();request('cinta_dungeon_join_v88',{p_code:$('joinCode').value.trim().toUpperCase(),p_class:selectedClass});};$('joinCode').oninput=()=>{$('joinCode').value=$('joinCode').value.replace(/\s/g,'').toUpperCase();};$('refresh').onclick=listRuns;$('backLobby').onclick=leave;$('newAdventure').onclick=leave;
 $('inviteOpen').onclick=()=>{if(run){$('copyFeedback').textContent='';$('inviteDialog').showModal();}};$('copyCode').onclick=async()=>{try{await navigator.clipboard.writeText($('inviteCode').value);$('copyFeedback').textContent='Adventure code copied.';audio.play('select');}catch{$('inviteCode').select();$('copyFeedback').textContent='Select and copy this code to share it.';}};
 $('settingsOpen').onclick=()=>$('settingsDialog').showModal();
 function soundLabel(){$('soundToggle').textContent=!window.CintaAudio?'Sound unavailable':audio.enabled?'Sound on':'Sound off';$('soundToggle').disabled=!window.CintaAudio;$('soundToggle').setAttribute('aria-pressed',String(audio.enabled));}
 $('soundToggle').onclick=()=>{audio.setEnabled(!audio.enabled);soundLabel();if(audio.enabled)audio.play('select');};soundLabel();
 $('volume').oninput=()=>audio.setVolume(Number($('volume').value)/100);$('battleSpeed').onchange=()=>{speed=Number($('battleSpeed').value);saveSettings();};$('motion').onchange=()=>{motion=$('motion').checked;document.documentElement.dataset.motion=String(motion);saveSettings();};
 document.addEventListener('click',e=>{const button=e.target.closest('button');if(button&&!button.disabled&&button.id!=='soundToggle')audio.play('click',.45);});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(run)fetchRun();else listRuns();}});window.addEventListener('online',()=>run?fetchRun():listRuns());
 initializeAuth();
})();
