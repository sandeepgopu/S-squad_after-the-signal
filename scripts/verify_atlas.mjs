import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const data=JSON.parse(readFileSync(new URL('data/atlas-missions.json',root)));
const seen=new Set();
for(const m of data.missions){
  if(seen.has(m.id))throw Error(`Duplicate mission ${m.id}`);
  seen.add(m.id);
  if(!['moon','mars'].includes(m.body))throw Error(`${m.id}: unsupported surface body`);
  if(!Number.isFinite(Date.parse(m.startUtc))||!Number.isFinite(Date.parse(m.endUtc))||Date.parse(m.startUtc)>=Date.parse(m.endUtc))throw Error(`${m.id}: invalid time range`);
  if(m.spacecraftSpk&&(!Number.isInteger(m.spacecraftSpk.naifId)||!m.spacecraftSpk.url.startsWith('https://naif.jpl.nasa.gov/')))throw Error(`${m.id}: invalid SPK declaration`);
  if(m.orbitSpk&&(!Number.isInteger(m.orbitSpk.naifId)||!Number.isInteger(m.orbitSpk.centerId)||!m.orbitSpk.url.startsWith('https://naif.jpl.nasa.gov/')||m.orbitSpk.frame!=='J2000'))throw Error(`${m.id}: invalid orbit SPK declaration`);
  for(const e of m.events){
    if(!e.source?.startsWith('https://'))throw Error(`${m.id}/${e.id}: source missing`);
    if(!Number.isFinite(Date.parse(e.utc)))throw Error(`${m.id}/${e.id}: invalid UTC`);
    if(e.kind==='surface'&&(![-90,90].includes(e.lat)&&!(e.lat>-90&&e.lat<90)||e.lonEast<0||e.lonEast>=360||e.body!==m.body))throw Error(`${m.id}/${e.id}: invalid surface coordinate`);
  }
}
const epi=new URL('data/atlas-ephemeris.json',root);
if(existsSync(epi)){
  const ephem=JSON.parse(readFileSync(epi));
  if(ephem.frame!=='ECLIPJ2000'||ephem.origin!=='SUN'||ephem.unit!=='km')throw Error('Ephemeris coordinate contract mismatch');
  for(const m of data.missions){
    const samples=ephem.segments[m.id]?.samples;
    if(!samples?.length)throw Error(`${m.id}: missing ephemeris`);
    if(m.spacecraftSpk&&!samples.some(s=>s.spacecraft))throw Error(`${m.id}: missing spacecraft positions`);
  }
}
const orbitFile=new URL('data/atlas-orbits.json',root);
if(existsSync(orbitFile)){
  const orbits=JSON.parse(readFileSync(orbitFile));
  if(orbits.unit!=='km')throw Error('Orbit units mismatch');
  for(const m of data.missions.filter(x=>x.orbitSpk)){
    const o=orbits.segments[m.id];
    if(!o?.samples?.length||o.frame!==m.orbitSpk.frame||o.centerId!==m.orbitSpk.centerId||o.naifId!==m.orbitSpk.naifId)throw Error(`${m.id}: orbit kernel data mismatch`);
  }
}
console.log(`Verified ${data.missions.length} atlas missions and coordinate contracts.`);
