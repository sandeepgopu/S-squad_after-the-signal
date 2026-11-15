const $ = id => document.getElementById(id);
const video = $('rideVideo');
const acts = [
  {sol:1,title:'First explorations',date:'2004 onward',heading:'A new world outside the window',story:'Hello, explorer! Opportunity has landed in Eagle Crater. Let’s look around for clues that water once flowed on Mars.',short:'We land in Eagle Crater and look for clues about ancient water.'},
  {sol:900,title:'The long drive',date:'2006 onward',heading:'Follow those wheel tracks',story:'Look at the ground as it changes. Opportunity kept driving over plains, stopping to study rocks and craters. Each picture is a real moment on Mars. We skip ahead between many Martian days.',short:'We cross the plains, stopping at rocks and craters.'},
  {sol:2681,title:'Endeavour years',date:'2011 onward',heading:'A giant crater ahead',story:'After years of travel, Opportunity reached giant Endeavour Crater. New rocks brought new questions. What do you notice?',short:'We reach the rim of enormous Endeavour Crater.'},
  {sol:4736,title:'Final years',date:'2017–2018',heading:'One more look at Mars',story:'Opportunity explored near Perseverance Valley. Our last picture comes before its final signal. Follow the full Mars story to find out what happened.',short:'We visit the rover’s final exploration area.'}
];
let manifest;
let currentAct = -1;
let narrationOn = true;
let lastSpokenAct = -1;

function frameAt(time){
  if(!manifest?.frames?.length)return null;
  const index=Math.min(manifest.frames.length-1,Math.max(0,Math.floor(time*manifest.framesPerSecond)));
  return manifest.frames[index];
}
function actFor(sol){let i=0;for(let n=0;n<acts.length;n++)if(sol>=acts[n].sol)i=n;return i}
function stamp(seconds){const s=Math.floor(seconds||0);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`}
function speak(index){
  if(!narrationOn||!('speechSynthesis' in window)||index===lastSpokenAct)return;
  speechSynthesis.cancel();
  const utterance=new SpeechSynthesisUtterance(acts[index].story);
  utterance.lang='en-US';utterance.rate=.93;utterance.pitch=1.08;
  speechSynthesis.speak(utterance);
  lastSpokenAct=index;
  $('voiceStatus').textContent=`Narrating: ${acts[index].title}`;
}
function update(){
  const frame=frameAt(video.currentTime);
  $('elapsed').textContent=stamp(video.currentTime);
  $('scrubber').value=String(Math.min(video.currentTime,Number($('scrubber').max)));
  if(!frame)return;
  const index=actFor(frame.sol);
  $('currentSol').textContent=`Sol ${frame.sol}`;
  $('currentDate').textContent=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(frame.utc))+' UTC';
  $('originalPhoto').href=frame.source;
  if(index!==currentAct){
    currentAct=index;
    $('currentHeading').textContent=acts[index].heading;
    $('currentText').textContent=acts[index].short;
    [...$('acts').children].forEach((node,i)=>node.classList.toggle('active',i===index));
    if(!video.paused)speak(index);
  }
}
function play(){
  $('startRide').classList.add('hidden');
  video.play().then(()=>{
    $('playPause').textContent='Ⅱ';$('playPause').setAttribute('aria-label','Pause video');
    if(narrationOn){lastSpokenAct=-1;speak(actFor(frameAt(video.currentTime)?.sol||1))}
    else $('voiceStatus').textContent='Playing without narration.';
  }).catch(()=>{$('startRide').classList.remove('hidden');$('voiceStatus').textContent='Press play to begin the ride.'});
}
function pause(){video.pause();if('speechSynthesis' in window)speechSynthesis.cancel();$('playPause').textContent='▶';$('playPause').setAttribute('aria-label','Play video');$('voiceStatus').textContent='Ride paused.'}

for(let i=0;i<acts.length;i++){
  const button=document.createElement('button');button.type='button';button.className='act';
  button.innerHTML=`<span class="number">0${i+1} / THE RIDE</span><strong>${acts[i].title}</strong><small>${acts[i].date}</small>`;
  button.addEventListener('click',()=>{
    const frame=manifest?.frames.find(item=>item.sol>=acts[i].sol);
    if(frame){video.currentTime=frame.timeSeconds;lastSpokenAct=-1;currentAct=-1;update();if(video.paused)play();else speak(i)}
  });
  $('acts').append(button);
}
$('startRide').addEventListener('click',play);
$('playPause').addEventListener('click',()=>video.paused?play():pause());
$('scrubber').addEventListener('input',event=>{video.currentTime=Number(event.target.value);lastSpokenAct=-1;currentAct=-1;update()});
$('narration').addEventListener('click',()=>{
  narrationOn=!narrationOn;
  $('narration').setAttribute('aria-pressed',String(narrationOn));
  $('narration').querySelector('span').textContent=narrationOn?'Story voice on':'Story voice off';
  if(!narrationOn){if('speechSynthesis' in window)speechSynthesis.cancel();$('voiceStatus').textContent='Playing without narration.'}
  else{lastSpokenAct=-1;if(!video.paused)speak(currentAct<0?0:currentAct);else $('voiceStatus').textContent='Story voice is ready.'}
});
video.addEventListener('timeupdate',update);
video.addEventListener('seeked',update);
video.addEventListener('pause',()=>{if('speechSynthesis' in window)speechSynthesis.cancel();$('playPause').textContent='▶';$('playPause').setAttribute('aria-label','Play video')});
video.addEventListener('ended',()=>{if('speechSynthesis' in window)speechSynthesis.cancel();$('voiceStatus').textContent='Ride complete. Explore the full mission story for Opportunity’s last chapter.'});
video.addEventListener('loadedmetadata',()=>{$('scrubber').max=String(video.duration);$('duration').textContent=stamp(video.duration)});
window.addEventListener('pagehide',()=>{if('speechSynthesis' in window)speechSynthesis.cancel()});
let photoZoom=1, photoX=0, photoY=0, dragStart=null;
function transformPhoto(){$('inspectImage').style.transform=`translate(${photoX}px,${photoY}px) scale(${photoZoom})`}
function zoomPhoto(change){photoZoom=Math.max(1,Math.min(5,photoZoom*change));if(photoZoom===1){photoX=0;photoY=0}transformPhoto()}
$('inspectPhoto').addEventListener('click',()=>{
  const frame=frameAt(video.currentTime);if(!frame)return;
  if(!video.paused)pause();
  photoZoom=1;photoX=0;photoY=0;transformPhoto();
  $('inspectImage').src=frame.source;
  $('inspectTitle').textContent=`Sol ${frame.sol} · ${frame.utc.slice(0,10)} UTC`;
  $('inspectSource').href=frame.source;
  $('photoDialog').showModal();
});
$('closePhoto').addEventListener('click',()=>$('photoDialog').close());
$('inspectIn').addEventListener('click',()=>zoomPhoto(1.4));
$('inspectOut').addEventListener('click',()=>zoomPhoto(1/1.4));
$('inspectStage').addEventListener('wheel',event=>{event.preventDefault();zoomPhoto(event.deltaY<0?1.15:1/1.15)},{passive:false});
$('inspectStage').addEventListener('pointerdown',event=>{dragStart={x:event.clientX-photoX,y:event.clientY-photoY};$('inspectStage').setPointerCapture(event.pointerId)});
$('inspectStage').addEventListener('pointermove',event=>{if(!dragStart||photoZoom===1)return;photoX=event.clientX-dragStart.x;photoY=event.clientY-dragStart.y;transformPhoto()});
$('inspectStage').addEventListener('pointerup',()=>{dragStart=null});
fetch('/ride/manifest.json').then(response=>{if(!response.ok)throw Error('Photo record unavailable');return response.json()}).then(data=>{manifest=data;$('frameCount').textContent=data.frameCount;$('downloadMovie').textContent=`Download the ${Math.round(data.durationSeconds)}-second movie ↓`;update()}).catch(()=>{$('voiceStatus').textContent='The movie is ready, but individual photo records could not load.'});
if(!('speechSynthesis' in window)){$('narration').disabled=true;$('narration').title='This browser does not support speech playback';$('voiceStatus').textContent='This browser cannot speak the story. You can still watch the ride.'}
