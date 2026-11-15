import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {phasesForMission, positionAvailability, phaseSource, spacecraftSampleAvailable} from '../mission-adapter.js';
const read = file => JSON.parse(readFileSync(new URL(`../data/${file}`, import.meta.url), 'utf8'));
const sequences=read('story-sequences.json'), atlas=read('atlas-missions.json'), stories=read('missions.json'), objects=read('atlas-objects.json').objects, extras=read('story-extras.json');
assert.equal(sequences.schemaVersion,1);
assert(atlas.missions.some(m=>m.id===sequences.solarOverviewSegment),'Overview must identify an atlas segment');
const kinds=new Set(['launch','parking-orbit','injection','maneuver','encounter','landing','surface','end']);
const precision=new Set(['second','minute','day','month','year']);
for(const [id,sequence] of Object.entries(sequences.missions)){
  const mission=atlas.missions.find(m=>m.id===id);assert(mission,`Unknown mission ${id}`);
  const story=stories.missions.find(m=>m.id===id);
  assert.equal(typeof sequence.capabilities?.story,'boolean',`Missing story capability for ${id}`);
  if(sequence.capabilities.story)assert(story,`Story missing for ${id}`);
  for(const key of ['narration','cruiseTrajectory','surfaceRoute'])assert.equal(typeof sequence.capabilities?.[key],'boolean',`Missing ${key} capability for ${id}`);
  if(sequence.trajectory){assert(typeof sequence.trajectory.segmentId==='string'&&sequence.trajectory.status,`Incomplete trajectory for ${id}`);assert.equal(typeof sequence.trajectory.spacecraft,'boolean');assert(atlas.missions.some(m=>m.id===sequence.trajectory.segmentId),`Unknown trajectory segment for ${id}`)}
  assert(!sequence.capabilities.cruiseTrajectory||sequence.trajectory?.spacecraft,`Missing spacecraft segment for ${id}`);
  if(sequence.route){assert(extras.missions?.[id]?.[sequence.route.extrasKey],`Missing route media for ${id}`);for(const key of ['buttonLabel','title','captionNote','precisionNote'])assert(sequence.route[key],`Missing route ${key}`)}
  for(const link of sequence.links||[]){assert(link.label&&(link.href||link.hrefTemplate),`Incomplete link for ${id}`);assert((link.href||link.hrefTemplate).startsWith('/'),`Non-local story link for ${id}`)}
  const base=story?.chapters||[],baseIds=new Set(base.map(c=>c.id));
  if(sequence.phases?.length)assert(baseIds.has(sequence.insertAfter),`Unknown insertion chapter for ${id}`);
  for(const chapterId of Object.keys(sequence.chapterOverrides||{}))assert(baseIds.has(chapterId),`Unknown overridden chapter ${chapterId}`);
  const ids=new Set(baseIds);
  for(const phase of sequence.phases||[]){assert(!ids.has(phase.id),`Duplicate chapter ${phase.id}`);ids.add(phase.id);assert(kinds.has(phase.kind),`Unknown event kind ${phase.kind}`)}
  const chapters=sequence.capabilities.story?phasesForMission(mission,story,sequence):[];
  for(const phase of chapters){
    assert(precision.has(phase.timePrecision),`Missing precision for ${phase.id}`);
    assert(Number.isFinite(Date.parse(phase.dateUtc)),`Invalid date for ${phase.id}`);
    assert(phase.dateLabel&&phase.title&&phase.story&&phase.scene,`Incomplete chapter ${phase.id}`);
    assert(/^https:\/\//.test(phaseSource(phase,story,mission)||''),`Missing source for ${phase.id}`);
    if(phase.locationId)assert(story.locations.some(l=>l.id===phase.locationId),`Unknown location for ${phase.id}`);
  }
  for(const [objectId,chapterId] of Object.entries(sequence.objectChapterLinks||{})){
    assert(objects.some(o=>o.id===objectId&&o.missionId===id),`Unknown mission object ${objectId}`);assert(ids.has(chapterId),`Unknown linked chapter ${chapterId}`);
  }
  for(const chapterId of Object.keys(sequence.chapterNotes||{}))assert(ids.has(chapterId),`Unknown noted chapter ${chapterId}`);
}
// A synthetic second story checks missing, out-of-range, and day-precision behavior without adding fictional mission records.
const fixture={id:'fixture',events:[]},story={chapters:[{id:'one',dateUtc:'2020-01-01T12:00:00Z',timePrecision:'minute',sources:['src']}],sources:{src:{url:'https://example.org/source'}}},sequence={capabilities:{story:true},phases:[]};
const [chapter]=phasesForMission(fixture,story,sequence);
assert.equal(phaseSource(chapter,story,fixture),'https://example.org/source');
assert.equal(positionAvailability(chapter,null),'unavailable');
const sample={samples:[{utc:'2020-01-01T00:00:00Z'},{utc:'2020-01-02T00:00:00Z'}]};
assert.equal(positionAvailability(chapter,sample),'available');
assert.equal(spacecraftSampleAvailable(chapter,sample),false);
assert.equal(spacecraftSampleAvailable(chapter,{samples:sample.samples.map(s=>({...s,spacecraft:[1,2,3]}))}),true);
assert.equal(positionAvailability({...chapter,dateUtc:'2019-01-01T12:00:00Z'},sample),'outside-samples');
assert.equal(positionAvailability({...chapter,timePrecision:'day'},sample),'imprecise-time');
console.log(`Verified ${Object.keys(sequences.missions).length} mission story sequence(s), source/precision contracts, and no-trajectory behavior.`);
