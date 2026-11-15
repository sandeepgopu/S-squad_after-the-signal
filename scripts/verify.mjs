import { readFileSync, existsSync } from 'node:fs';
const catalog = JSON.parse(readFileSync(new URL('../data/missions.json', import.meta.url)));
const validDate = s => !Number.isNaN(Date.parse(s.length === 7 ? `${s}-01` : s));
for (const m of catalog.missions) {
  if (!m.id || !m.chapters?.length || !m.sources) throw new Error('Incomplete mission');
  if (!validDate(m.launch.utc) || !validDate(m.arrival.utcDate)) throw new Error('Invalid mission date');
  const locationIds = new Set(m.locations.map(p => p.id));
  for (const p of m.locations) {
    if (p.latitude != null && (p.latitude < -90 || p.latitude > 90 || p.longitudeEast < 0 || p.longitudeEast >= 360)) throw new Error(`Invalid Mars coordinate: ${p.id}`);
    for (const s of p.sources) if (!m.sources[s]) throw new Error(`Missing source ${s}`);
  }
  for (const c of m.chapters) {
    if (!validDate(c.dateUtc)) throw new Error(`Bad chapter date ${c.id}`);
    if (c.locationId && !locationIds.has(c.locationId)) throw new Error(`Bad chapter location ${c.id}`);
    for (const s of c.sources) if (!m.sources[s]) throw new Error(`Missing source ${s}`);
    for (const id of c.artifactIds || []) if (!m.artifacts.some(a=>a.id===id)) throw new Error(`Bad chapter artifact ${id}`);
    if (c.ground) {
      if (!['panorama','photo'].includes(c.ground.type) || !m.sources[c.ground.source]) throw new Error(`Bad ground view ${c.id}`);
      if (!existsSync(new URL(`..${c.ground.path}`, import.meta.url))) throw new Error(`Missing ground image ${c.ground.path}`);
    }
  }
  for (const a of m.artifacts) {
    if (a.locationId && !locationIds.has(a.locationId)) throw new Error(`Bad artifact location ${a.id}`);
    for (const s of a.sources) if (!m.sources[s]) throw new Error(`Missing source ${s}`);
  }
}
console.log(`Verified ${catalog.missions.length} mission(s), coordinate bounds, event dates, and source references.`);
