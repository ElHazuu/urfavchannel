// Cinta Kita v87 — sign-in and dungeon game logic
const DUNGEON_SUPABASE_URL="https://djhhwdjgokzofkaemrpf.supabase.co";
const DUNGEON_SUPABASE_KEY="sb_publishable_74Fr4c8T4OIKBgXED-sgsg_iUPBviG0";
// Reuses the main website's Supabase project and browser session.
let accountUser=null;
const mainWebsite=document.getElementById('mainWebsite');
const dungeonGate=document.getElementById('dungeonAuthGate');
const dungeonAuthFeedback=document.getElementById('dungeonAuthFeedback');
const accountClient=window.supabase?.createClient(DUNGEON_SUPABASE_URL,DUNGEON_SUPABASE_KEY)||null;
function closePuzzle(){} function closeCalendar(){} function closeMenu(){} function closeActivity(){} function closeUpdates(){}
function openAccount(){dungeonGate.hidden=false;document.getElementById('dungeonEmail').focus();}
function dungeonShowUser(user){
  accountUser=user||null;
  window.cintaDungeon?.syncAuth();
  dungeonGate.hidden=!!user;
  document.getElementById('dungeonLanding').hidden=true;
  document.getElementById('dungeonSignOut').hidden=!user;
  if(user){document.getElementById('dungeonToggle').click();}
  else dungeonAuthFeedback.textContent='Sign in with the same account you use on Cinta Kita.';
}
document.getElementById('dungeonLoginForm').addEventListener('submit',async event=>{
  event.preventDefault();
  if(!accountClient){dungeonAuthFeedback.textContent='Sign-in could not load. Check your connection and refresh this page.';return;}
  const button=document.getElementById('dungeonSignIn');button.disabled=true;dungeonAuthFeedback.textContent='Signing in…';
  try{
    const {data,error}=await accountClient.auth.signInWithPassword({email:document.getElementById('dungeonEmail').value.trim(),password:document.getElementById('dungeonPassword').value});
    if(error)throw error;document.getElementById('dungeonPassword').value='';dungeonShowUser(data.user);
  }catch(error){dungeonAuthFeedback.textContent=error?.message||'Could not sign in. Try again.';}
  finally{button.disabled=false;}
});
document.getElementById('dungeonSignOut').addEventListener('click',async()=>{
  if(!accountClient)return;
  const {error}=await accountClient.auth.signOut();
  if(error){document.getElementById('dungeonFeedback').textContent='Could not sign out. Please try again.';return;}
  dungeonShowUser(null);
});
function dungeonInitializeAuth(){
  if(!accountClient){dungeonAuthFeedback.textContent='Sign-in could not load. Check your connection and refresh this page.';return;}
  let authGeneration=0;
  accountClient.auth.onAuthStateChange((event,session)=>{
    const token=++authGeneration;
    // Defer async auth calls outside Supabase's auth callback.
    setTimeout(async()=>{
      if(token!==authGeneration)return;
      if(event==='INITIAL_SESSION'&&session?.user){
        try{const {data,error}=await accountClient.auth.getUser();if(token===authGeneration)dungeonShowUser(error?null:data.user);}
        catch{if(token===authGeneration)dungeonShowUser(null);}
      }else if((session?.user?.id||null)!==(accountUser?.id||null)||event==='INITIAL_SESSION')dungeonShowUser(session?.user||null);
    },0);
  });
}

/* Cinta Kita v87: authoritative online co-op, distinct enemy art and paced combat. */
(() => {
  'use strict';
  const el=id=>document.getElementById(id), panel=el('dungeonPanel'), toggle=el('dungeonToggle');
  let run=null, channel=null, timer=null, busy=false, loading=false, generation=0, authId=null, lastVersion=-1, lastRunId=null;
  let presentationRun=null, presenting=false, pendingSnapshot=null, playbackEpoch=0;
  const statusLabels={lobby:'Ready to enter',active:'In battle',room_clear:'Room cleared',won:'Dungeon complete',lost:'Defeated'};
  const feedback=(message='',error=false)=>{el('dungeonFeedback').textContent=message;el('dungeonFeedback').dataset.error=String(error);};
  const myId=()=>accountUser?.id;
  const node=(tag,content,className)=>{const n=document.createElement(tag);if(content!==undefined)n.textContent=content;if(className)n.className=className;return n;};
  function setBusy(value){busy=value;panel.setAttribute('aria-busy',String(value));render();}
  function errorText(error){
    if(['42P01','42883','PGRST202','PGRST205'].includes(error?.code))return 'Dungeon setup is not ready yet. Please finish the database update supplied with v87.';
    return error?.message||'Connection interrupted. Please try again.';
  }
  function stopLive(){if(channel){accountClient?.removeChannel(channel);channel=null;}clearInterval(timer);timer=null;}
  function remember(){try{if(run)localStorage.setItem(`cintaDungeonRun:${myId()}`,run.id);}catch{}}
  function apply(data,animate=true){
    if(!data||!data.members?.includes(myId()))return;
    if(presenting){if(!pendingSnapshot||Number(data.version)>Number(pendingSnapshot.version))pendingSnapshot=data;return;}
    if(run?.id===data.id&&Number(data.version)<Number(run.version))return;
    const changed=run?.id===data.id&&Number(data.version)>Number(run.version);
    const before=run;run=data;remember();render();if(animate)animateChanges(before,data);

  }
  async function fetchRun(){
    if(!run||loading||busy||presenting||panel.hidden||!myId())return;
    const id=run.id,uid=myId(),token=generation;loading=true;
    try{
      const {data,error}=await accountClient.from('cinta_dungeon_runs').select('*').eq('id',id).maybeSingle();
      if(token!==generation||uid!==myId()||run?.id!==id)return;
      if(error)throw error;
      if(data){apply(data);el('dungeonConnection').textContent='Synced · saved automatically';}
      else{stopLive();run=null;render();feedback('This adventure is no longer available.',true);}
    }catch(error){if(token===generation){el('dungeonConnection').textContent='Reconnecting…';feedback(errorText(error),true);}}
    finally{loading=false;}
  }
  function subscribe(){
    stopLive();if(!run||panel.hidden)return;
    const id=run.id,token=generation;
    el('dungeonConnection').textContent='Connecting…';
    channel=accountClient.channel(`cinta-dungeon-${id}-${token}`)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'cinta_dungeon_runs',filter:`id=eq.${id}`},()=>{if(token===generation&&run?.id===id)fetchRun();})
      .subscribe(status=>{if(token===generation&&run?.id===id)el('dungeonConnection').textContent=status==='SUBSCRIBED'?'Live · saved automatically':'Syncing…';});
    timer=setInterval(()=>{if(!document.hidden)fetchRun();},4000);
  }
  function browse(){
    stopLive();if(panel.hidden||!myId())return;
    channel=accountClient.channel(`cinta-dungeon-lobby-${myId()}-${generation}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'cinta_dungeon_runs'},()=>{if(!run&&!busy&&!panel.hidden)saved();}).subscribe();
    timer=setInterval(()=>{if(!run&&!busy&&!document.hidden)saved();},6000);
  }
  async function saved(){
    if(!myId()||!accountClient)return;
    const uid=myId(),token=generation;el('dungeonSaved').textContent='Loading saved adventures…';
    try{
      const {data,error}=await accountClient.from('cinta_dungeon_runs').select('*').order('updated_at',{ascending:false}).limit(12);
      if(token!==generation||uid!==myId())return;if(error)throw error;
      const own=el('dungeonSaved'),open=el('dungeonOpenAdventures');own.replaceChildren();open.replaceChildren();
      for(const item of data||[]){
        const member=item.members.includes(uid);
        if(!member&&!['lobby','active','room_clear'].includes(item.status))continue;
        const row=node('div',undefined,'ckDungeonSavedRow'),text=node('div');
        text.append(node('strong',`${statusLabels[item.status]||'Adventure'} · Room ${item.state.room}/3`),node('small',`${item.state.players.map(p=>p.name).join(', ')} · ${item.members.length} ${item.members.length===1?'player':'players'}`));
        const button=node('button',member?'Resume':'Join');button.type='button';button.disabled=busy;
        button.onclick=()=>{
          if(busy)return;
          if(!member){rpc('cinta_dungeon_join',{p_code:item.join_code,p_class:el('dungeonClass').value});return;}
          generation++;apply(item);subscribe();fetchRun();feedback();
        };
        row.append(text,button);(member?own:open).append(row);
      }
      if(!own.childElementCount)own.textContent='You have no saved adventures yet.';
      if(!open.childElementCount)open.textContent='No open adventures right now. Create one and start exploring.';
    }catch(error){if(token===generation){el('dungeonSaved').textContent='Could not load adventures.';feedback(errorText(error),true);}}
  }
  async function rpc(name,args){
    if(busy||!myId()||!accountClient)return;
    const uid=myId(),token=generation;setBusy(true);feedback();
    try{
      let response;
      for(let attempt=0;attempt<3;attempt++){
        response=await accountClient.rpc(name,args);
        if(token!==generation||uid!==myId())return;
        if(!response.error||name!=='cinta_dungeon_command'||!response.error.message?.startsWith('The adventure changed')||attempt===2)break;
        const fresh=await accountClient.from('cinta_dungeon_runs').select('*').eq('id',args.p_run).maybeSingle();
        if(token!==generation||uid!==myId())return;
        if(fresh.error||!fresh.data)break;
        apply(fresh.data);
        if((['attack','skill','defend','heal','revive'].includes(args.p_action)&&fresh.data.status!=='active')||(args.p_action==='start'&&fresh.data.status!=='lobby')||(args.p_action==='next'&&fresh.data.status!=='room_clear')){response={data:fresh.data,error:null};break;}
        args={...args,p_version:fresh.data.version};
      }
      if(response.error)throw response.error;
      const previous=run?.id;
      const result=Array.isArray(response.data)?response.data[0]:response.data;
      const played=name==='cinta_dungeon_command'&&await playAction(run,result,args.p_action,uid,token);
      if(token!==generation||uid!==myId())return;
      apply(result,!played);
      if(pendingSnapshot){const latest=pendingSnapshot;pendingSnapshot=null;apply(latest);}
      if(run?.id!==previous)subscribe();
    }catch(error){if(token===generation&&uid===myId()){feedback(errorText(error),true);await fetchRun();}}
    finally{if(token===generation)setBusy(false);}
  }
  function sprite(type){const n=node('div',undefined,'ckSprite');n.dataset.sprite=type;n.setAttribute('aria-hidden','true');return n;}
  function healthCard(player,index){
    const card=node('div',undefined,'ckBattleFighter');card.dataset.playerId=player.id;card.dataset.class=player.class;
    card.dataset.current=String(player.id===myId());card.dataset.down=String(player.hp<=0);
    const plate=node('div',undefined,'ckBattleNameplate');plate.append(node('h3',player.name),node('p',player.class==='knight'?'Knight':'Ranger'));
    if(player.id===myId())plate.append(node('small','YOU','ckHeroYou'));
    const bar=node('div',undefined,'ckDungeonBar'),fill=node('span');fill.style.width=`${Math.max(0,Math.min(100,100*player.hp/player.max_hp))}%`;bar.append(fill);
    plate.append(bar,node('p',`${player.hp} / ${player.max_hp}${player.hp<=0?' · Down':''}`));
    card.append(plate,sprite(player.class==='ranger'?'ranger':'knight'));return card;
  }
  function animateChanges(before,after){
    if(!before||before.id!==after.id||before.state.room!==after.state.room||Number(before.version)>=Number(after.version))return;
    const snapshot=after.version;
    setTimeout(()=>{
      if(run?.id!==after.id||run.version!==snapshot||panel.hidden)return;
      function effect(card,kind,amount){
        if(!card)return;const image=card.querySelector('.ckSprite');if(image){image.dataset.motion=kind;setTimeout(()=>{if(image.isConnected)delete image.dataset.motion;},700);}
        if(amount){const value=node('span',amount>0?`+${amount}`:String(amount),'ckFloatingNumber');value.dataset.heal=String(amount>0);card.append(value);setTimeout(()=>value.remove(),900);}
      }
      for(const p of after.state.players){const old=before.state.players.find(x=>x.id===p.id);if(!old)continue;
        const card=[...el('dungeonPlayers').children].find(x=>x.dataset.playerId===p.id),delta=p.hp-old.hp;
        if(delta)effect(card,delta>0?'heal':'hurt',delta);
      }
      if(before.state.enemy&&after.state.enemy){
        const delta=after.state.enemy.hp-before.state.enemy.hp;
        if(delta<0){effect(el('dungeonEnemy'),'hurt',delta);const flash=node('div',undefined,'ckBattleFlash');el('dungeonArena').append(flash);setTimeout(()=>flash.remove(),550);
          const line=[...after.state.log].reverse().find(line=>line.includes(' attacks,')||line.includes(' uses '));
          const attacker=line&&after.state.players.find(p=>line.startsWith(p.name+' '));
          if(attacker){const card=[...el('dungeonPlayers').children].find(x=>x.dataset.playerId===attacker.id);effect(card,'attack',0);}
        }
      }
    },0);
  }
  // The server saves the entire exchange atomically. Playback only stages its
  // confirmed result; it never sends a second request to make the enemy respond.
  async function playAction(before,after,action,uid,token){
    if(!before||!after||before.id!==after.id||before.status!=='active'||before.state.room!==after.state.room||!['attack','skill','defend','heal','revive'].includes(action)||Number(after.version)!==Number(before.version)+1)return false;
    const actor=before.state.players.find(p=>p.id===uid);if(!actor)return false;
    const epoch=++playbackEpoch;presenting=true;
    const valid=()=>epoch===playbackEpoch&&token===generation&&uid===myId()&&!panel.hidden;
    const wait=ms=>new Promise(resolve=>setTimeout(()=>resolve(valid()),ms));
    const clone=value=>JSON.parse(JSON.stringify(value));
    const intermediate=clone(before),st=intermediate.state;
    st.enemy=clone(after.state.enemy);
    const updated=after.state.players.find(p=>p.id===uid);
    const own=st.players.find(p=>p.id===uid);
    if(updated){own.potions=updated.potions;own.skills=updated.skills;}
    if(action==='heal')own.hp=Math.min(own.max_hp,own.hp+16);
    if(action==='defend')own.guard=true;
    if(action==='revive'){
      const fallen=st.players.find(p=>p.id!==uid&&p.hp<=0);
      if(fallen)fallen.hp=12;
    }
    function phase(text,kind){const banner=el('dungeonPhase');banner.textContent=text;banner.dataset.phase=kind;banner.hidden=false;el('dungeonTurn').textContent=text;}
    function card(id){return [...el('dungeonPlayers').children].find(n=>n.dataset.playerId===id);}
    function effect(target,motion,amount=0){
      if(!target)return;
      const image=target.querySelector('.ckSprite');if(image){image.dataset.motion=motion;setTimeout(()=>{if(image.isConnected)delete image.dataset.motion;},650);}
      if(amount){const n=node('span',amount>0?`+${amount}`:String(amount),'ckFloatingNumber');n.dataset.heal=String(amount>0);target.append(n);setTimeout(()=>n.remove(),900);}
    }
    try{
      phase(action==='heal'?`${actor.name} prepares a potion…`:action==='revive'?`${actor.name} helps a fallen ally…`:action==='defend'?`${actor.name} raises their guard…`:action==='skill'?`${actor.name} prepares ${actor.class==='knight'?'Power Strike':'Aimed Shot'}…`:`${actor.name} prepares an attack…`,'hero');
      effect(card(uid),'ready');
      if(!await wait(300))return true;
      presentationRun=intermediate;render();
      if(action==='attack'||action==='skill'){
        effect(card(uid),action==='skill'?'skill':'attack');
        effect(el('dungeonEnemy'),'hurt',st.enemy.hp-before.state.enemy.hp);
        phase(`${actor.name} ${action==='skill'?'uses '+(actor.class==='knight'?'Power Strike':'Aimed Shot'):'attacks'}.`,'hero');
      }else if(action==='heal'){effect(card(uid),'heal',own.hp-actor.hp);phase(`${actor.name} restores health.`,'hero');}
      else if(action==='revive'){const p=st.players.find(p=>before.state.players.find(old=>old.id===p.id)?.hp<=0&&p.hp>0);if(p)effect(card(p.id),'heal',p.hp);phase('Your ally is back on their feet.','hero');}
      else{effect(card(uid),'defend');phase(`${actor.name} braces for the enemy’s attack.`,'hero');}
      if(!await wait(650))return true;
      if(st.enemy.hp>0){
        const heavy=st.room===3&&before.state.round%3===0;
        phase(heavy?`${st.enemy.name} prepares a sweeping attack…`:`${st.enemy.name} prepares to strike…`,'enemy');
        effect(el('dungeonEnemy'),'ready');
        if(!await wait(650))return true;
        presentationRun=clone(after);render();phase(heavy?'The king strikes the party!':`${st.enemy.name} strikes back.`,'enemy');
        effect(el('dungeonEnemy'),'enemyAttack');
        for(const p of after.state.players){const old=st.players.find(x=>x.id===p.id);if(old&&p.hp<old.hp)effect(card(p.id),'hurt',p.hp-old.hp);}
        if(!await wait(600))return true;
      }else{
        phase(`${st.enemy.name} is defeated.`,'recover');
        if(!await wait(600))return true;
      }
      phase(after.status==='active'?'Choose your next action.':after.status==='won'?'Dungeon complete.':'Room cleared.','recover');
      await wait(250);
      return true;
    }finally{
      if(epoch===playbackEpoch){presentationRun=null;presenting=false;el('dungeonPhase').hidden=true;}
    }
  }
  function render(){
    const shown=presentationRun||run;
    el('dungeonLobby').hidden=!!shown;el('dungeonRun').hidden=!shown;
    el('dungeonCreate').disabled=busy;el('dungeonClass').disabled=busy;el('dungeonCode').disabled=busy;
    el('dungeonJoinForm').querySelector('button').disabled=busy;el('dungeonRefresh').disabled=busy;
    if(!shown)return;
    const st=shown.state,me=st.players.find(p=>p.id===myId()),fallen=st.players.find(p=>p.id!==myId()&&p.hp<=0);
    const mine=shown.status==='active'&&me?.hp>0;
    el('dungeonRoom').textContent=`Room ${st.room} / 3 · ${statusLabels[shown.status]} · ${st.players.length} ${st.players.length===1?'player':'players'}`;
    el('dungeonCoins').textContent=`Party treasure: ${st.coins} coins`;
    el('dungeonInvite').hidden=!['lobby','active','room_clear'].includes(shown.status);el('dungeonInviteCode').value=shown.join_code;
    el('dungeonBattleRoom').textContent=`Goblin Hollow · Room ${st.room} / 3`;
    const players=el('dungeonPlayers');
    const featured=[...st.players].sort((a,b)=>Number(b.id===myId())-Number(a.id===myId())).slice(0,4);
    players.replaceChildren(...featured.map(healthCard));players.dataset.many=String(featured.length>2);
    const roster=el('dungeonRoster');roster.replaceChildren();
    for(const p of st.players){const card=node('div',undefined,'ckRosterEntry');card.append(node('strong',`${p.name}${p.id===myId()?' · You':''}`),node('p',`${p.class==='knight'?'Knight':'Ranger'} · ${p.hp} / ${p.max_hp} HP`),node('p',`${p.potions} potions · ${p.skills} skill charges${p.hp<=0?' · Down':''}`));roster.append(card);}
    el('dungeonRosterTitle').textContent=`Party details · ${st.players.length} ${st.players.length===1?'player':'players'}`;
    const enemy=el('dungeonEnemy');enemy.hidden=!st.enemy;
    el('dungeonIntent').hidden=!st.enemy||shown.status!=='active';
    if(st.enemy){
      enemy.dataset.defeated=String(st.enemy.hp<=0);enemy.dataset.room=String(st.room);
      const plate=node('div',undefined,'ckBattleNameplate');plate.append(node('h3',st.enemy.name));
      const bar=node('div',undefined,'ckDungeonBar'),fill=node('span');fill.style.width=`${100*st.enemy.hp/st.enemy.max_hp}%`;bar.append(fill);
      plate.append(bar,node('p',`${st.enemy.hp} / ${st.enemy.max_hp} HP`));enemy.replaceChildren(plate,sprite(st.room===3?'king':st.room===2?'guard':'scout'));
      el('dungeonIntent').textContent=st.room===3&&st.round%3===0?`Heavy attack next: ${st.enemy.attack+2} damage to every standing player.`:`Enemy response: ${st.enemy.attack} damage to the player who acts.`;
    }
    el('dungeonSupplies').textContent=me?`Your supplies: ${me.potions} ${me.potions===1?'potion':'potions'} · ${me.skills} skill charges · ${me.hp} / ${me.max_hp} HP`:'';
    const turn=el('dungeonTurn');
    if(shown.status==='lobby')turn.textContent='Enter when you are ready. Other players can join while you explore.';
    else if(shown.status==='active')turn.textContent=busy?'Resolving your action…':mine?'Choose an action. The enemy will respond.':'Your character is down. Another player can revive you, or you can start a new adventure.';
    else if(shown.status==='room_clear')turn.textContent='Room cleared. Continue when you are ready; everyone recovers 8 HP and one skill charge.';
    else if(shown.status==='won')turn.textContent='The Goblin King is defeated. Your party earned 120 coins.';
    else turn.textContent='Your party has fallen. Create a new adventure to try again.';
    el('dungeonActions').hidden=shown.status!=='active';
    el('dungeonAttackInfo').textContent=`${me?.class==='knight'?9:8} damage`;
    el('dungeonSkillInfo').textContent=`${me?.class==='knight'?'Power Strike · 15':'Aimed Shot · 17'} damage · ${me?.skills||0} left`;
    for(const b of panel.querySelectorAll('[data-dungeon-action]')){
      const action=b.dataset.dungeonAction;b.disabled=busy||!mine||(action==='skill'&&me.skills<=0)||(action==='heal'&&(me.potions<=0||me.hp>=me.max_hp))||(action==='revive'&&(me.potions<=0||!fallen));
    }
    el('dungeonStart').hidden=shown.status!=='lobby';el('dungeonStart').disabled=busy;
    el('dungeonNext').hidden=shown.status!=='room_clear';el('dungeonNext').disabled=busy;
    el('dungeonAgain').hidden=!['won','lost'].includes(shown.status)&&me?.hp>0;el('dungeonAgain').disabled=busy;
    if(lastVersion!==shown.version||lastRunId!==shown.id){el('dungeonLog').replaceChildren(...st.log.map(line=>node('li',line)));el('dungeonLog').scrollTop=el('dungeonLog').scrollHeight;lastVersion=shown.version;lastRunId=shown.id;}
  }
  function syncAuth(){
    const id=myId()||null;if(id===authId)return;authId=id;generation++;playbackEpoch++;presentationRun=null;presenting=false;pendingSnapshot=null;el('dungeonPhase').hidden=true;stopLive();run=null;busy=false;lastVersion=-1;lastRunId=null;feedback();render();if(!id)close();else if(!panel.hidden){saved();browse();}
  }
  async function open(event){
    event?.preventDefault();if(!myId()){openAccount(toggle);return;}
    syncAuth();closePuzzle();closeCalendar();closeMenu();closeActivity();closeUpdates();
    el('dungeonLanding').hidden=true;panel.hidden=false;document.body.classList.add('ckDungeonOpen');toggle.setAttribute('aria-expanded','true');
    history.pushState(null,'','#dungeon');el('dungeonClose').focus();render();
    if(run){subscribe();fetchRun();}else{saved();browse();}
  }
  function close(){
    if(panel.hidden)return;playbackEpoch++;presentationRun=null;presenting=false;pendingSnapshot=null;el('dungeonPhase').hidden=true;panel.hidden=true;if(myId())el('dungeonLanding').hidden=false;document.body.classList.remove('ckDungeonOpen');toggle.setAttribute('aria-expanded','false');stopLive();
    if(location.hash==='#dungeon')history.replaceState(null,'',mainWebsite.dataset.wallpaper==='berserk'?'#berserk':'#home');toggle.focus();
  }
  toggle.addEventListener('click',open);el('dungeonClose').onclick=()=>{close();location.href='./index.html';};
  el('dungeonCreate').onclick=()=>rpc('cinta_dungeon_create',{p_class:el('dungeonClass').value});
  el('dungeonJoinForm').onsubmit=e=>{e.preventDefault();rpc('cinta_dungeon_join',{p_code:el('dungeonCode').value.trim().toUpperCase(),p_class:el('dungeonClass').value});};
  el('dungeonCode').addEventListener('input',()=>{el('dungeonCode').value=el('dungeonCode').value.replace(/\s/g,'').toUpperCase();});
  el('dungeonRefresh').onclick=saved;
  el('dungeonCollection').onclick=()=>{if(busy)return;generation++;stopLive();run=null;render();feedback();saved();browse();};
  el('dungeonAgain').onclick=()=>{if(busy)return;generation++;stopLive();run=null;render();feedback('Choose a class, then create or join an adventure.');saved();browse();};
  const command=action=>{if(run)rpc('cinta_dungeon_command',{p_run:run.id,p_action:action,p_version:run.version});};
  el('dungeonStart').onclick=()=>command('start');el('dungeonNext').onclick=()=>command('next');
  for(const b of panel.querySelectorAll('[data-dungeon-action]'))b.onclick=()=>command(b.dataset.dungeonAction);
  el('dungeonCopy').onclick=async()=>{try{await navigator.clipboard.writeText(el('dungeonInviteCode').value);feedback('Adventure code copied.');}catch{el('dungeonInviteCode').focus();el('dungeonInviteCode').select();feedback('Copy this adventure code to invite another player.');}};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!panel.hidden)fetchRun();});
  window.addEventListener('online',()=>{if(!panel.hidden)fetchRun();});
  window.addEventListener('popstate',()=>{if(!panel.hidden&&location.hash!=='#dungeon')close();});
  document.addEventListener('keydown',event=>{
    if(panel.hidden)return;
    if(event.key==='Escape'){event.preventDefault();close();}
    if(event.key==='Tab'){
      const focusable=[...panel.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(n=>n.getClientRects().length);
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&(document.activeElement===first||!panel.contains(document.activeElement))){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!panel.contains(document.activeElement))){event.preventDefault();first?.focus();}
    }
  });
  window.cintaDungeon={syncAuth,close};syncAuth();
})();

dungeonInitializeAuth();

