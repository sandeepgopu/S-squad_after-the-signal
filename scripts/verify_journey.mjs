import fs from 'node:fs';
import assert from 'node:assert/strict';

const catalogs = ['lunar-missions', 'mars-mission-stories'].map(name =>
  JSON.parse(fs.readFileSync(new URL(`../data/${name}.json`, import.meta.url), 'utf8')),
);
const missions = catalogs.flatMap(catalog => catalog.missions);
const ids = new Set();
const phaseTypes = new Set(['flight', 'solar', 'surface']);
const precisionTypes = new Set(['second', 'minute', 'day', 'month', 'year', 'not specified', 'ongoing at source publication']);
let phases = 0;
for (const mission of missions) {
  assert(mission.id && !ids.has(mission.id), `Duplicate or missing mission ID: ${mission.id}`);
  ids.add(mission.id);
  assert(mission.name && mission.phases?.length >= 2, `${mission.id}: missing story`);
  const phaseIds = new Set();
  let lastTime = -Infinity;
  for (const phase of mission.phases) {
    phases++;
    assert(phase.id && !phaseIds.has(phase.id), `${mission.id}: duplicate or missing phase ID`);
    phaseIds.add(phase.id);
    assert(phase.title && phase.narration && phaseTypes.has(phase.scene), `${mission.id}/${phase.id}: incomplete chapter`);
    assert(phase.sourceUrl?.startsWith('https://'), `${mission.id}/${phase.id}: source URL required`);
    const precision = phase.timePrecision ?? phase.precision;
    assert(precisionTypes.has(precision) || precision?.startsWith('0.1 second'), `${mission.id}/${phase.id}: invalid precision`);
    if (phase.dateUtc) {
      const time = Date.parse(phase.dateUtc);
      assert(Number.isFinite(time), `${mission.id}/${phase.id}: invalid UTC date`);
      // Input order can differ from story order; the player sorts dated chapters.
      lastTime = Math.max(lastTime, time);
    }
    const location = phase.location;
    if (location && (location.lat !== undefined || location.lonEast !== undefined)) {
      assert(Number.isFinite(location.lat) && Math.abs(location.lat) <= 90, `${mission.id}/${phase.id}: invalid latitude`);
      assert(Number.isFinite(location.lonEast) && location.lonEast >= 0 && location.lonEast < 360, `${mission.id}/${phase.id}: invalid east longitude`);
    }
    const image = phase.image ?? phase.media;
    if (image?.path) assert(image.path.startsWith('/assets/') || image.path.startsWith('https://'), `${mission.id}/${phase.id}: invalid media path`);
  }
}
for (const id of ['apollo-8','apollo-10','apollo-11','apollo-12','apollo-13','apollo-14','apollo-15','apollo-16','apollo-17','chandrayaan-1','chandrayaan-2','chandrayaan-3','mars-pathfinder','mer-a-spirit','mer-b-opportunity','msl-curiosity','mars-2020-perseverance','tianwen-1-zhurong']) {
  assert(ids.has(id), `Required mission missing: ${id}`);
}
console.log(`Verified ${missions.length} mission journeys and ${phases} sourced chapters.`);
