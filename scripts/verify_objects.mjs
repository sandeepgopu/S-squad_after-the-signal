import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const data=JSON.parse(readFileSync(new URL('../data/atlas-objects.json',import.meta.url)));
assert.equal(data.schemaVersion,1);
assert(Array.isArray(data.objects)&&data.objects.length>0);
const ids=new Set();
for(const object of data.objects){
  assert(typeof object.id==='string'&&object.id, 'Object ID required');
  assert(!ids.has(object.id), `Duplicate object ${object.id}`);
  ids.add(object.id);
  assert(['moon','mars'].includes(object.body), `Invalid body: ${object.id}`);
  assert(typeof object.name==='string'&&object.name, `Name required: ${object.id}`);
  assert(typeof object.site==='string'&&object.site, `Site required: ${object.id}`);
  assert(typeof object.source==='string'&&object.source.startsWith('https://'), `Source required: ${object.id}`);
  assert.equal(typeof object.storyAvailable,'boolean', `Story flag required: ${object.id}`);
  const hasLat=typeof object.lat==='number',hasLon=typeof object.lonEast==='number';
  assert.equal(hasLat,hasLon, `Latitude/longitude must be paired: ${object.id}`);
  if(hasLat){
    assert(object.lat>=-90&&object.lat<=90, `Latitude out of range: ${object.id}`);
    assert(object.lonEast>=0&&object.lonEast<360, `East longitude out of range: ${object.id}`);
  }
}
console.log(`Verified ${data.objects.length} sourced Mars/Moon object records and coordinate bounds.`);
