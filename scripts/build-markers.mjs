// Public marker geometry ONLY. Never export title, notes, photos, videos or user IDs.
import fs from 'node:fs/promises';
const url=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url || !key) throw new Error('Missing Supabase GitHub Actions secrets');
const endpoint=new URL('/rest/v1/ck_map_memories',url);
endpoint.searchParams.set('select','id,dimension,x,y,z');
endpoint.searchParams.set('map_id','eq.our_vanilla_world');
endpoint.searchParams.set('limit','1000');
const response=await fetch(endpoint,{headers:{apikey:key,Authorization:`Bearer ${key}`}});
if(!response.ok)throw new Error(`Supabase HTTP ${response.status}`);
const rows=await response.json();
if(!Array.isArray(rows))throw new Error('Invalid marker response');
const markers={};
const skipped={dimension:0,position:0,id:0};
console.log('Supabase rows returned:',rows.length);
for(const row of rows){
  if(row.dimension && !['minecraft:overworld','overworld'].includes(row.dimension)){skipped.dimension++;continue;}
  const position=[row.x,row.y,row.z].map(Number);
  if(!position.every(Number.isFinite)){skipped.position++;continue;}
  const id=String(row.id||'');
  if(!/^[a-z0-9_-]{6,70}$/i.test(id)){skipped.id++;continue;}
  markers[`memory_${id.replace(/-/g,'_')}`]={
    type:'html',
    position:{x:position[0]+0.5,y:position[1]+1.5,z:position[2]+0.5},
    label:'Memory',
    html:`<div class="ck-world-stamp" data-memory-id="${id}"><span class="ck-world-pin" aria-label="Memory marker">📷</span></div>`,
    anchor:{x:0,y:0},
    listed:false,
    minDistance:0,
    maxDistance:10000000,
    classes:['ck-memory-map-marker']
  };
}
const output={cinta_kita_memories:{label:'Memories',toggleable:true,defaultHidden:false,sorting:0,markers}};
const target='bluemap-offline/web/maps/our_vanilla_world/live/markers.json';
await fs.mkdir('bluemap-offline/web/maps/our_vanilla_world',{recursive:true});
await fs.writeFile(target,JSON.stringify(output,null,2)+'\n');
console.log('Skipped marker rows by reason:',JSON.stringify(skipped));
console.log(`Created ${Object.keys(markers).length} public location-only pins (no private details)`);
