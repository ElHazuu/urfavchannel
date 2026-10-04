/* Cinta Kita v88 — local Kenney CC0 effects + original magical accents. */
(() => {
 'use strict';
 const names=['click','select','error','sword','arrow','hit','enemy','shield','heal','revive','loot','door','skill','victory','defeat','poison','focus','combo'];
 let ctx=null,master=null,unlocked=false,enabled=false,volume=.45;
 const buffers=new Map(),loads=new Map(),failed=new Set(),active=new Set(),counts={};
 function store(){try{localStorage.setItem('cinta88Audio',JSON.stringify({enabled,volume}));}catch{}}
 try{const prefs=JSON.parse(localStorage.getItem('cinta88Audio')||'{}');enabled=prefs.enabled===true;if(Number.isFinite(prefs.volume))volume=Math.max(0,Math.min(1,prefs.volume));}catch{}
 function context(){
  if(ctx)return ctx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  try{ctx=new AC();master=ctx.createGain();master.gain.value=enabled?volume:0;master.connect(ctx.destination);return ctx;}catch{return null;}
 }
 async function load(name){
  if(buffers.has(name))return buffers.get(name);if(loads.has(name))return loads.get(name);
  const work=(async()=>{try{const c=context();if(!c)return null;const response=await fetch(`./audio/${name}.mp3?v=90`);if(!response.ok)throw Error('Use synthesized audio');const buffer=await c.decodeAudioData(await response.arrayBuffer());buffers.set(name,buffer);return buffer;}catch{failed.add(name);return null;}})();loads.set(name,work);return work;
 }
 async function unlock(){
  const c=context();unlocked=true;
  if(c){try{await c.resume();}catch{}}
  if(enabled)names.forEach(name=>load(name));
 }
 function setEnabled(value){enabled=!!value;if(master)master.gain.value=enabled?volume:0;if(!enabled){for(const s of active){try{s.stop();}catch{}}active.clear();}store();if(enabled)unlock();}
 function setVolume(value){volume=Math.max(0,Math.min(1,Number(value)||0));if(master)master.gain.value=enabled?volume:0;store();}
 async function play(name,scale=1){
  if(!enabled||!unlocked||document.hidden||!names.includes(name))return;
  const c=context();
  if(!c)return;
  const buffer=await load(name);if(!enabled||document.hidden||c.state!=='running')return;if(!buffer){synth(name,scale);counts[name]=(counts[name]||0)+1;return;}
  const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;gain.gain.value=scale;source.connect(gain);gain.connect(master);active.add(source);source.onended=()=>{active.delete(source);source.disconnect();gain.disconnect();};source.start();counts[name]=(counts[name]||0)+1;
 }
 function synth(name,scale=1){const c=context();if(!c||c.state!=='running'||!enabled)return;const freq={click:450,select:650,error:150,sword:190,arrow:670,hit:125,enemy:175,shield:490,heal:560,revive:490,loot:720,door:210,skill:370,victory:660,defeat:130,poison:240,focus:490,combo:510}[name]||400;const duration=name==='victory'?.48:name==='door'?.38:.15;const o=c.createOscillator(),g=c.createGain();o.type=['shield','heal','revive','loot','victory','focus'].includes(name)?'sine':'triangle';o.frequency.setValueAtTime(freq,c.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(65,freq*(name==='arrow'?1.4:.67)),c.currentTime+duration);g.gain.setValueAtTime(0,c.currentTime);g.gain.linearRampToValueAtTime(Math.min(.16,.10*scale),c.currentTime+.012);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+duration);o.connect(g);g.connect(master);o.start();o.stop(c.currentTime+duration);}
 function chord(kind){
  if(!enabled||!unlocked||document.hidden)return;const c=context();if(!c||c.state!=='running')return;
  const notes=kind==='victory'?[261.63,329.63,392,523.25]:kind==='heal'?[392,493.88,587.33]:kind==='combo'?[196,246.94,293.66,392]:[293.66,440];
  notes.forEach((hz,i)=>{const osc=c.createOscillator(),gain=c.createGain(),start=c.currentTime+i*.085;osc.type='sine';osc.frequency.value=hz;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.075,start+.025);gain.gain.exponentialRampToValueAtTime(.001,start+.55);osc.connect(gain);gain.connect(master);osc.start(start);osc.stop(start+.6);osc.onended=()=>{osc.disconnect();gain.disconnect();};});
 }
 document.addEventListener('pointerdown',unlock,{once:true});document.addEventListener('keydown',unlock,{once:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&ctx){ctx.suspend().catch(()=>{});}else if(ctx&&unlocked){ctx.resume().catch(()=>{});}});
 window.CintaAudio={play,chord,setEnabled,setVolume,unlock,get enabled(){return enabled;},get volume(){return volume;},diagnostics:()=>({loaded:buffers.size,failed:[...failed],counts:{...counts},state:ctx?.state||'none'})};
})();
