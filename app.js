const $ = id => document.getElementById(id);
const nodes = {
  eyebrow: $('chapterEyebrow'), date: $('chapterDate'), title: $('chapterTitle'),
  story: $('chapterStory'), fact: $('chapterFact'), progress: $('timelineProgress'),
  timeline: $('timeline'), sceneTitle: $('sceneTitle'), sceneOverline: $('sceneOverline'),
  sceneChip: $('sceneChip'), solar: $('solarScene'), mars: $('marsScene'), route: $('routeScene'),
  location: $('mapLocation'), coordinates: $('mapCoordinates'), objectName: $('objectName'),
  objectLocation: $('objectLocation'), next: $('nextButton'), prev: $('prevButton'),
  listen: $('listenButton'), info: $('infoPanel'), sources: $('sourceList')
};
let mission;
let catalog;
let chapterIndex = 0;
let viewer = null;
let markers = [];
let detailLayer = null;
let detailMode = false;
let guided = false;
let heardChapter = false;
let speechToken = 0;
let groundOpen = false;
let panoramaViewer = null;
let photoZoom = 1;
let photoX = 0;
let photoY = 0;
const MARS_RADIUS_EQUATOR = 3396190;
const MARS_RADIUS_POLAR = 3376200;

function locationText(p) {
  if (!p) return 'Journey to Mars';
  return p.name + (p.region ? ` · ${p.region}` : '');
}

function coordinateText(p) {
  if (!p || p.latitude == null || p.longitudeEast == null) return 'Mapped area · no invented point';
  const lat = `${Math.abs(p.latitude).toFixed(p.latitudeDecimals ?? 2)}° ${p.latitude < 0 ? 'S' : 'N'}`;
  const lon = `${p.longitudeEast.toFixed(p.longitudeDecimals ?? 2)}° E`;
  return `${lat} · ${lon}`;
}

function sourceLinks(chapter) {
  const ids = [...new Set([...chapter.sources, ...(chapter.ground?.source ? [chapter.ground.source] : []), ...(chapter.locationId ? (mission.locations.find(p => p.id === chapter.locationId)?.sources || []) : [])])];
  nodes.sources.replaceChildren(...ids.map(id => {
    const s = mission.sources[id];
    const a = document.createElement('a');
    a.href = s.url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.append(document.createTextNode(`${s.title} ↗`));
    const small = document.createElement('small');
    small.textContent = s.role;
    a.append(small);
    return a;
  }));
}

function cancelSpeech() {
  speechToken++;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

function updateVoiceControl(message) {
  nodes.listen.innerHTML = guided ? '<span>Ⅱ</span> Pause story' : `<span>▶</span> ${heardChapter ? 'Resume story' : 'Play story'}`;
  nodes.listen.setAttribute('aria-pressed', String(guided));
  $('voiceStatus').textContent = message || (guided ? 'Narrating this chapter. The next chapter will play automatically.' : heardChapter ? 'Story paused. Resume to hear this chapter, then continue in order.' : 'Press Play story to hear each chapter in order.');
}

function speakChapter() {
  if (!guided) return;
  if (!('speechSynthesis' in window)) { guided=false; updateVoiceControl('This browser has no synthetic voice. The story text remains available.'); return; }
  const token = ++speechToken;
  const c = mission.chapters[chapterIndex];
  const utterance = new SpeechSynthesisUtterance(`${c.title}. ${c.story}`);
  utterance.rate = .88;
  utterance.pitch = 1;
  utterance.lang = 'en-US';
  const voices = speechSynthesis.getVoices();
  utterance.voice = voices.find(v=>v.lang.startsWith('en') && v.localService) || voices.find(v=>v.lang.startsWith('en')) || null;
  utterance.onend = () => {
    if (!guided || token !== speechToken) return;
    if (chapterIndex === mission.chapters.length - 1) {
      guided=false; heardChapter=false; updateVoiceControl('The story is complete. Choose a chapter or play it again.'); return;
    }
    chapterIndex++; render();
  };
  utterance.onerror = event => {
    if (token !== speechToken || event.error === 'canceled' || event.error === 'interrupted') return;
    guided=false; updateVoiceControl('Narration stopped. You can read the chapter or try Play story again.');
  };
  speechSynthesis.speak(utterance);
  heardChapter=true;
  updateVoiceControl();
}

function sceneFor(chapter, p) {
  if (groundOpen) closeGround();
  nodes.solar.classList.toggle('hidden', chapter.scene !== 'solar');
  nodes.mars.classList.toggle('hidden', chapter.scene !== 'mars');
  nodes.route.classList.toggle('hidden', chapter.scene !== 'map');
  nodes.sceneOverline.textContent = chapter.scene === 'solar' ? 'THE JOURNEY' : chapter.scene === 'map' ? 'THE ORIGINAL MISSION MAP' : `MARS / ${p?.region?.toUpperCase() || 'SURFACE'}`;
  nodes.sceneTitle.textContent = chapter.scene === 'solar' ? 'Earth to Mars' : chapter.scene === 'map' ? 'The route that remains' : p?.name || 'Mars';
  nodes.sceneChip.textContent = chapter.scene === 'solar' ? 'SCHEMATIC · SPICE ATLAS LINKED' : chapter.scene === 'map' ? 'NASA ORIGINAL IMAGE' : 'NASA MARS TREK IMAGERY';
  nodes.location.textContent = p?.name || 'Mars';
  nodes.coordinates.textContent = coordinateText(p);
  $('evidenceCard').classList.toggle('hidden', !chapter.image);
  if (chapter.image) {
    $('evidenceImage').src = chapter.image.path;
    $('evidenceImage').alt = chapter.image.alt;
    $('evidenceCredit').textContent = chapter.image.credit;
  }
  nodes.objectName.textContent = chapter.objectLabel || chapter.artifactIds?.map(id=>mission.artifacts.find(a=>a.id===id)?.name).filter(Boolean).join(' + ') || mission.artifacts[0]?.name || mission.name;
  nodes.objectLocation.textContent = locationText(p);
  if (chapter.scene === 'map' && chapter.image) {
    $('routeImage').src = chapter.image.path;
    $('routeImage').alt = chapter.image.alt;
    $('routeCaption').textContent = chapter.image.credit;
  }
  const meridiani = p?.latitude >= -4.8925742 && p?.latitude <= -0.6078623 && p?.longitudeEast >= 351.906516 && p?.longitudeEast <= 357.1962942;
  $('surfaceButton').classList.toggle('hidden', !meridiani);
  $('groundButton').classList.toggle('hidden', !chapter.ground);
  if (!meridiani && detailMode) setDetailMode(false);
  if (chapter.scene === 'mars') {
    if (!viewer) initGlobe();
    if (viewer && p?.latitude != null) flyTo(p);
    requestAnimationFrame(() => viewer?.resize());
  }
}

function render() {
  cancelSpeech();
  const c = mission.chapters[chapterIndex];
  const p = c.locationId ? mission.locations.find(x => x.id === c.locationId) : null;
  nodes.eyebrow.textContent = c.eyebrow;
  nodes.date.textContent = c.dateLabel;
  nodes.title.textContent = c.title;
  nodes.story.textContent = c.story;
  nodes.fact.textContent = c.fact;
  $('rideInvite').classList.toggle('hidden', chapterIndex !== mission.chapters.length-1 || !mission.ride);
  if(mission.ride){$('rideInvite').querySelector('a').href=mission.ride.path;$('rideInvite').querySelector('h3').textContent=mission.ride.question;$('rideInvite').querySelector('p').textContent=mission.ride.description;}
  nodes.progress.textContent = `${String(chapterIndex + 1).padStart(2, '0')} / ${String(mission.chapters.length).padStart(2, '0')}`;
  nodes.next.innerHTML = chapterIndex === mission.chapters.length - 1 ? 'Return to the beginning <span>↺</span>' : chapterIndex === 0 ? 'Begin the journey <span>→</span>' : 'Next chapter <span>→</span>';
  nodes.prev.disabled = chapterIndex === 0;
  nodes.prev.style.opacity = chapterIndex === 0 ? '.35' : '1';
  [...nodes.timeline.children].forEach((el, i) => {
    el.classList.toggle('active', i === chapterIndex);
    el.classList.toggle('done', i < chapterIndex);
    el.setAttribute('aria-current', i === chapterIndex ? 'step' : 'false');
  });
  sceneFor(c, p);
  sourceLinks(c);
  history.replaceState(null, '', `#${mission.id}/${c.id}`);
  if (guided) requestAnimationFrame(speakChapter);
  else updateVoiceControl();
}

function initGlobe() {
  try {
    const C = window.Cesium;
    if (!C) throw new Error('Cesium did not load');
    const mars = new C.Ellipsoid(MARS_RADIUS_EQUATOR, MARS_RADIUS_EQUATOR, MARS_RADIUS_POLAR);
    viewer = new C.Viewer('globe', {
      ellipsoid:mars, mapProjection:new C.GeographicProjection(mars), globe:new C.Globe(mars),
      baseLayer: false, terrainProvider: new C.EllipsoidTerrainProvider({ellipsoid:mars}),
      animation:false, timeline:false, homeButton:false, geocoder:false, baseLayerPicker:false,
      fullscreenButton:false, navigationHelpButton:false, sceneModePicker:false, infoBox:false,
      selectionIndicator:false, shouldAnimate:false, skyBox:false, skyAtmosphere:false,
      requestRenderMode:true, maximumRenderTimeChange:Infinity
    });
    viewer.scene.globe.baseColor = C.Color.fromCssColorString('#633b31');
    viewer.scene.globe.enableLighting = false;
    viewer.scene.globe.showGroundAtmosphere = false;
    viewer.imageryLayers.removeAll();
    const imagery = new C.UrlTemplateImageryProvider({
      url:'/api/tiles/viking/{z}/{x}/{y}.jpg',
      tilingScheme:new C.GeographicTilingScheme({ellipsoid:mars,numberOfLevelZeroTilesX:2,numberOfLevelZeroTilesY:1}),
      maximumLevel:7, tileWidth:256,tileHeight:256,
      credit:'NASA/JPL-Caltech/USGS · Mars Trek Viking color global mosaic'
    });
    viewer.imageryLayers.addImageryProvider(imagery);
    const regional = new C.UrlTemplateImageryProvider({
      url:'/api/tiles/meridiani/{z}/{x}/{y}.png',
      tilingScheme:new C.GeographicTilingScheme({ellipsoid:mars,numberOfLevelZeroTilesX:2,numberOfLevelZeroTilesY:1}),
      rectangle:C.Rectangle.fromDegrees(-8.093484,-4.8925742,-2.8037058,-0.6078623),
      maximumLevel:12,tileWidth:256,tileHeight:256,
      credit:'NASA/JPL-Caltech/MSSS · Mars Trek Meridiani CTX mosaic'
    });
    detailLayer = viewer.imageryLayers.addImageryProvider(regional);
    detailLayer.show = false;
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 2000;
    viewer.scene.screenSpaceCameraController.maximumZoomDistance = 15000000;
    const firstPoint = mission.locations.find(x=>x.latitude != null);
    viewer.scene.camera.setView({destination:C.Cartesian3.fromDegrees(firstPoint?.longitudeEast ?? 0,firstPoint?.latitude ?? 0,2200000,mars)});
    for (const p of mission.locations.filter(x => x.latitude != null)) {
      const isLanding = p.kind === 'landing site';
      markers.push(viewer.entities.add({
        id:p.id,position:C.Cartesian3.fromDegrees(p.longitudeEast,p.latitude,1500,mars),
        point:{pixelSize:isLanding?13:11,color:C.Color.fromCssColorString(isLanding?'#f4bc8e':'#7ad9d0'),outlineColor:C.Color.WHITE,outlineWidth:2,heightReference:C.HeightReference.NONE},
        label:{text:p.name,font:'600 14px DM Sans',fillColor:C.Color.WHITE,outlineColor:C.Color.BLACK,outlineWidth:3,style:C.LabelStyle.FILL_AND_OUTLINE,pixelOffset:new C.Cartesian2(0,-22),distanceDisplayCondition:new C.DistanceDisplayCondition(0,5000000)},
        description:p.certainty
      }));
    }
    viewer.scene.requestRender();
    const c = mission.chapters[chapterIndex], p = mission.locations.find(x=>x.id===c.locationId);
    if (p?.latitude != null) flyTo(p);
  } catch (error) {
    console.error('Mars globe unavailable:',error);
    $('globeFallback').classList.remove('hidden');
    $('globe').classList.add('hidden');
    viewer = null;
  }
}

function flyTo(p) {
  if (!viewer || !window.Cesium || p.latitude == null) return;
  const C = window.Cesium;
  const mars = viewer.scene.globe.ellipsoid;
  for (const marker of markers) marker.show = marker.id === p.id;
  viewer.camera.flyTo({destination:C.Cartesian3.fromDegrees(p.longitudeEast,p.latitude,detailMode?90000:2000000,mars),duration:1.6});
  viewer.scene.requestRender();
}

function setDetailMode(on) {
  detailMode = on;
  if (detailLayer) detailLayer.show = on;
  $('surfaceButton').textContent = on ? 'Back to globe ↑' : 'Explore surface ↓';
  $('mapAttribution').textContent = on ? 'Grayscale CTX regional mosaic · Mars Trek · NASA/JPL-Caltech/MSSS' : 'Viking colour global mosaic · Mars Trek · NASA/JPL-Caltech/USGS';
  viewer?.scene.requestRender();
}

function applyPhotoZoom() {
  $('groundPhoto').style.transform = `translate(${photoX}px, ${photoY}px) scale(${photoZoom})`;
}

function changePhotoZoom(factor) {
  photoZoom = Math.max(1, Math.min(5, photoZoom * factor));
  if (photoZoom === 1) photoX = photoY = 0;
  applyPhotoZoom();
}

function closeGround() {
  groundOpen = false;
  panoramaViewer?.destroy(); panoramaViewer = null;
  $('groundPanorama').replaceChildren();
  $('groundScene').classList.add('hidden');
  const c = mission?.chapters[chapterIndex];
  nodes.solar.classList.toggle('hidden', c?.scene !== 'solar');
  nodes.mars.classList.toggle('hidden', c?.scene !== 'mars');
  nodes.route.classList.toggle('hidden', c?.scene !== 'map');
  $('groundButton').classList.toggle('hidden', !c?.ground);
  if (c) {
    const p = mission.locations.find(x=>x.id===c.locationId);
    nodes.sceneOverline.textContent = c.scene === 'solar' ? 'THE JOURNEY' : c.scene === 'map' ? 'THE ORIGINAL MISSION MAP' : `MARS / ${p?.region?.toUpperCase() || 'SURFACE'}`;
    nodes.sceneTitle.textContent = c.scene === 'solar' ? 'Earth to Mars' : c.scene === 'map' ? 'The route that remains' : p?.name || 'Mars';
    nodes.sceneChip.textContent = c.scene === 'solar' ? 'ILLUSTRATIVE PATH' : c.scene === 'map' ? 'NASA ORIGINAL IMAGE' : 'NASA MARS TREK IMAGERY';
  }
}

function openGround(asset) {
  if (!asset) return;
  if (groundOpen) closeGround();
  groundOpen = true;
  $('groundScene').classList.remove('hidden');
  nodes.solar.classList.add('hidden');
  nodes.mars.classList.add('hidden');
  nodes.route.classList.add('hidden');
  $('groundButton').classList.add('hidden');
  $('groundTitle').textContent = asset.title;
  $('groundNote').textContent = asset.note;
  $('groundCredit').textContent = asset.credit;
  nodes.sceneOverline.textContent = asset.type === 'panorama' ? 'ROVER CAMERA / GROUND VIEW' : 'ORIGINAL MISSION IMAGE';
  nodes.sceneTitle.textContent = asset.title;
  nodes.sceneChip.textContent = asset.type === 'panorama' ? 'REAL ROVER PANORAMA' : 'NASA ORIGINAL IMAGE';
  const isPanorama = asset.type === 'panorama';
  $('groundPanorama').classList.toggle('hidden', !isPanorama);
  $('groundPhotoWrap').classList.toggle('hidden', isPanorama);
  $('groundZoom').classList.toggle('hidden', isPanorama);
  if (isPanorama) {
    if (!window.pannellum) { $('groundNote').textContent = 'The panorama viewer did not load. Please refresh the page.'; return; }
    panoramaViewer = window.pannellum.viewer('groundPanorama', {
      type:'equirectangular', panorama:asset.path, autoLoad:true,
      haov:360, vaov:asset.vaov, vOffset:asset.vOffset || 0,
      hfov:Math.min(65,asset.vaov*1.3), minHfov:20, maxHfov:105,
      backgroundColor:[.40,.34,.28],
      showFullscreenCtrl:false, compass:false,
      strings:{loadButtonLabel:'Open rover panorama'}
    });
  } else {
    const photo = $('groundPhoto');
    photo.onload = () => {
      if (!groundOpen || photo.src !== new URL(asset.path, location.href).href) return;
      const wrap = $('groundPhotoWrap');
      const imageAspect = photo.naturalWidth / photo.naturalHeight;
      const boxAspect = wrap.clientWidth / wrap.clientHeight;
      photoZoom = asset.cover ? Math.min(5, Math.max(1, imageAspect / boxAspect, boxAspect / imageAspect)) : 1;
      photoX = photoY = 0; applyPhotoZoom();
    };
    photo.src = asset.path;
    photo.alt = asset.alt || asset.note;
    photoZoom = 1; photoX = photoY = 0; applyPhotoZoom();
  }
}

function selectMission(id, chapterId) {
  const selected = catalog.missions.find(m=>m.id===id) || catalog.missions[0];
  if (viewer && mission?.id !== selected.id) {
    viewer.destroy(); viewer = null; markers = []; detailLayer = null;
    $('globe').replaceChildren();
  }
  mission = selected;
  setDetailMode(false);
  $('missionSelect').value = mission.id;
  const heading = $('introTitle');
  const accent = mission.titleAccent;
  if (accent && mission.narrativeTitle.endsWith(accent)) {
    const highlighted = document.createElement('em');highlighted.textContent=accent;
    heading.replaceChildren(document.createTextNode(mission.narrativeTitle.slice(0,-accent.length)),highlighted);
  } else heading.textContent = mission.narrativeTitle;
  $('introOverview').textContent = mission.overview;
  $('missionPrecisionNote').textContent = mission.arrival.note || `Arrival precision: ${mission.arrival.precision}.`;
  $('precisionLegend').replaceChildren(...mission.locations.map(p=>{
    const row=document.createElement('div');row.className='legend-row';
    const dot=document.createElement('span');dot.className=`legend-dot ${p.geometry === 'point' ? 'exact' : p.geometry === 'feature centre' ? 'region' : 'area'}`;
    const copy=document.createElement('div');const title=document.createElement('strong');title.textContent=p.name;
    const note=document.createElement('p');note.textContent=p.certainty;
    copy.append(title,note);row.append(dot,copy);return row;
  }));
  const displayMonth = value => new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value));
  $('flightDates').innerHTML = `${displayMonth(mission.launch.utc)} <span>→</span> ${displayMonth(mission.arrival.utcDate)}`;
  nodes.timeline.replaceChildren(...mission.chapters.map((c,i) => {
    const b=document.createElement('button');b.type='button';b.className='timeline-step';
    b.innerHTML=`${String(i+1).padStart(2,'0')}<strong></strong>`;
    b.querySelector('strong').textContent=c.title;
    b.addEventListener('click',()=>{chapterIndex=i;render()});return b;
  }));
  chapterIndex = Math.max(0, mission.chapters.findIndex(c=>c.id===chapterId));
  render();
}

function openInfo() { nodes.info.classList.add('open'); nodes.info.setAttribute('aria-hidden','false'); $('closeInfo').focus(); }
function closeInfo() { nodes.info.classList.remove('open'); nodes.info.setAttribute('aria-hidden','true'); }

async function boot() {
  const response = await fetch('/api/missions',{cache:'no-store'});
  if (!response.ok) throw new Error('Mission data did not load');
  catalog = await response.json();
  const selector = $('missionSelect');
  selector.replaceChildren(...catalog.missions.map((m,i)=>new Option(`${String(i+1).padStart(2,'0')}: ${m.name.toUpperCase()}`,m.id)));
  selector.addEventListener('change',()=>selectMission(selector.value));
  nodes.next.addEventListener('click',()=>{chapterIndex=(chapterIndex+1)%mission.chapters.length;render()});
  $('surfaceButton').addEventListener('click',()=>{
    if(!viewer)return;
    setDetailMode(!detailMode);
    const c=mission.chapters[chapterIndex],p=mission.locations.find(x=>x.id===c.locationId);
    if(p)flyTo(p);
  });
  nodes.prev.addEventListener('click',()=>{if(chapterIndex>0){chapterIndex--;render()}});
  nodes.listen.addEventListener('click',()=>{
    guided = !guided;
    if (guided) speakChapter();
    else { cancelSpeech(); updateVoiceControl('Story paused. Choose Resume story to continue this chapter.'); }
  });
  $('groundButton').addEventListener('click',()=>openGround(mission.chapters[chapterIndex].ground));
  $('groundExit').addEventListener('click',closeGround);
  $('evidenceOpen').addEventListener('click',()=>{
    const image=mission.chapters[chapterIndex].image;
    if(image)openGround({type:'photo',path:image.path,title:'Original NASA image',note:image.alt,credit:image.credit,alt:image.alt});
  });
  $('routeOpen').addEventListener('click',()=>{
    const image=mission.chapters[chapterIndex].image;
    if(image)openGround({type:'photo',path:image.path,title:'Original NASA map',note:image.alt,credit:image.credit,alt:image.alt});
  });
  $('zoomIn').addEventListener('click',()=>changePhotoZoom(1.4));
  $('zoomOut').addEventListener('click',()=>changePhotoZoom(1/1.4));
  const photoWrap=$('groundPhotoWrap');
  let lastX=0,lastY=0;
  photoWrap.addEventListener('pointerdown',e=>{photoWrap.setPointerCapture(e.pointerId);lastX=e.clientX;lastY=e.clientY;});
  photoWrap.addEventListener('pointermove',e=>{if(!photoWrap.hasPointerCapture(e.pointerId)||photoZoom<=1)return;photoX+=e.clientX-lastX;photoY+=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;applyPhotoZoom();});
  photoWrap.addEventListener('wheel',e=>{e.preventDefault();changePhotoZoom(e.deltaY<0?1.15:1/1.15)},{passive:false});
  $('aboutButton').addEventListener('click',openInfo);
  $('mapInfoButton').addEventListener('click',openInfo);
  $('closeInfo').addEventListener('click',closeInfo);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeInfo();if(groundOpen)closeGround()}if(e.key==='ArrowRight'&&!nodes.info.classList.contains('open')&&!groundOpen)nodes.next.click();if(e.key==='ArrowLeft'&&!nodes.info.classList.contains('open')&&!groundOpen)nodes.prev.click()});
  const [missionId, chapterId] = location.hash.slice(1).split('/');
  selectMission(missionId, chapterId);
}
boot().catch(error=>{console.error(error);nodes.story.textContent='Mission data could not load. Please refresh this page or check the Windows server.'});
