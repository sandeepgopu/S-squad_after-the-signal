// Shared, data-driven contract for story assembly and temporal availability.
export function phasesForMission(mission, story, sequence) {
  if (!mission || !story || !sequence?.capabilities?.story) return [];
  const chapters = story.chapters.map(chapter => ({...chapter, ...sequence.chapterOverrides?.[chapter.id]}));
  const additions = sequence.phases || [];
  if (additions.length) {
    const index = chapters.findIndex(chapter => chapter.id === sequence.insertAfter);
    if (index < 0) return [];
    chapters.splice(index + 1, 0, ...additions);
  }
  return chapters;
}
export function positionAvailability(phase, segment) {
  if (!phase?.dateUtc || !['second','minute'].includes(phase.timePrecision)) return 'imprecise-time';
  const time = Date.parse(phase.dateUtc), samples = segment?.samples;
  if (!Number.isFinite(time) || !samples?.length) return 'unavailable';
  const first = Date.parse(samples[0].utc), last = Date.parse(samples[samples.length - 1].utc);
  return time >= first && time <= last ? 'available' : 'outside-samples';
}
export function phaseSource(phase, story, mission) {
  return phase.sourceUrl || story?.sources?.[phase.sources?.[0]]?.url || mission?.events?.find(e => e.id === phase.id)?.source || null;
}
// Match the renderer: a spacecraft point needs both surrounding states, or the first sample itself.
export function spacecraftSampleAvailable(phase, segment) {
  if (positionAvailability(phase,segment)!=='available') return false;
  const ms=Date.parse(phase.dateUtc), samples=segment.samples;
  let lo=0,hi=samples.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(Date.parse(samples[mid].utc)<ms)lo=mid+1;else hi=mid;}
  const a=samples[Math.max(0,lo-1)],b=samples[lo];
  return !!a.spacecraft && !!b.spacecraft;
}
