'use strict';
const canvas=document.getElementById('game');
const ui=Object.fromEntries(['menu','hud','touch','pause','result','guide','boards','score','progress','menu-best','start-hint','result-label','result-title','result-score','result-copy'].map(id=>[id,document.getElementById(id)]));
const game=new KaariPhysics(),keys=new Set(),touchKeys=new Set();
let gameMode='story';
function courseList(){return [...KAARI_MAPS.flatMap((m,map)=>m.sandboxOnly?[{map,title:m.name,story:m.description,goal:0}]:[]),...JUMPBAR_CHAPTERS];}
function canPlayMap(map){return KAARI_MAPS[map].sandboxOnly?campaign.sandboxUnlocked:campaign.available(map);}
const touchPointers=new Map();
const touchMode=navigator.maxTouchPoints>0||matchMedia('(any-pointer: coarse)').matches;
document.body.dataset.touch=String(touchMode);
if(touchMode)ui['start-hint'].textContent='Hold GRIP · build momentum with TUCK';
const graphics=new KaariRenderer(canvas);
let campaignSave=null;try{campaignSave=JSON.parse(localStorage.getItem('jumpbar-campaign-v1'));}catch{}
const campaign=new JumpbarCampaign(campaignSave);
let selectedCharacter=campaign.data.equipped;
const initialStartHint=ui['start-hint'].innerHTML;
function saveCampaign(){try{localStorage.setItem('jumpbar-campaign-v1',JSON.stringify(campaign.data));}catch{document.getElementById('wallet').title='Saving is unavailable. Progress lasts for this session.';}}
function updateCampaignMenu(){
  const c=JUMPBAR_CHARACTERS.find(c=>c.id===selectedCharacter),owned=campaign.owns(c.id),chapter=courseList().find(c=>c.map===game.mapIndex),unlocked=canPlayMap(game.mapIndex);
  document.getElementById('wallet').textContent='◈ '+campaign.data.coins;
  document.getElementById('character-ability').textContent=c.ability+' · '+c.instruction;
  const buy=document.getElementById('buy-character');buy.hidden=owned;buy.disabled=campaign.data.coins<c.price;buy.textContent=buy.disabled?'◈ '+c.price+' · need '+(c.price-campaign.data.coins):'BUY · ◈ '+c.price;
  document.getElementById('chapter-title').textContent=chapter.title;
  document.getElementById('chapter-goal').textContent=gameMode==='sandbox'?'FREE PLAY · NO FINISH LINE':unlocked?'TARGET '+chapter.goal+' PTS · '+('★'.repeat(campaign.stars(game.mapIndex))||'☆☆☆'):(gameMode==='sandbox'?'LOCKED · complete the story':'LOCKED · finish the previous chapter');
  document.getElementById('chapter-story').textContent=chapter.story;document.getElementById('mode-name').textContent=gameMode==='sandbox'?'SANDBOX':'STORY';
  const play=document.getElementById('play');play.disabled=!owned||!unlocked;play.textContent=!unlocked?'LOCKED':!owned?'SELECT OWNED':gameMode==='sandbox'?'FREE PLAY ↗':campaign.cleared(game.mapIndex)?'PLAY AGAIN ↗':'START CHAPTER ↗';
}
document.getElementById('buy-character').onclick=()=>{if(campaign.buy(selectedCharacter)){saveCampaign();selectCharacter(selectedCharacter);}};
function selectCharacter(id){
  const character=JUMPBAR_CHARACTERS.find(c=>c.id===id)||JUMPBAR_CHARACTERS[0];
  selectedCharacter=character.id;graphics.setCharacter(character.id);
  document.getElementById('character-name').textContent=character.name;document.getElementById('character-style').textContent=character.style;document.getElementById('character-counter').textContent=String(JUMPBAR_CHARACTERS.indexOf(character)+1).padStart(2,'0')+' / '+String(JUMPBAR_CHARACTERS.length).padStart(2,'0');
  document.querySelectorAll('[data-character]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.character===character.id)));
  if(campaign.equip(character.id)){game.characterId=character.id;saveCampaign();}
  updateCampaignMenu();
}
function cycleCharacter(direction){const index=JUMPBAR_CHARACTERS.findIndex(c=>c.id===selectedCharacter);selectCharacter(JUMPBAR_CHARACTERS[(index+direction+JUMPBAR_CHARACTERS.length)%JUMPBAR_CHARACTERS.length].id);}
document.getElementById('character-prev').onclick=()=>cycleCharacter(-1);
document.getElementById('character-next').onclick=()=>cycleCharacter(1);
selectCharacter(selectedCharacter);
let width=1000,height=550,scale=1,camera=0,cameraY=160,cameraSpan=480,trail=[],particles=[],best=0,screen='menu',menuTime=0;
function readBest(){best=campaign.data.records[game.mapIndex]?.best||0;}
function baseSpan(){return touchMode?(height>width?460:360):480;}
function floorMargin(span){return touchMode?(height>width?155:115)*span/height:70;}
function followMobilePlayer(dt=0,snap=false){
  const p=game.player;
  const highCliff=game.water&&terrainHeight(game.map,game.mat.x)>400&&!game.splash;
  const nextBar=game.bars.find((_,i)=>!game.visited.has(i));
  const altitude=Math.max(0,K_FLOOR-p.y,p.bar>=0&&nextBar?K_FLOOR-nextBar.y+70:0);
  const desiredSpan=highCliff?Math.max(baseSpan(),(altitude+180)/(1-Math.min(.34,155/height))):baseSpan();
  const span=snap?desiredSpan:cameraSpan+(desiredSpan-cameraSpan)*(1-Math.exp(-5*dt)),view=width/height*span;
  const flying=p.bar<0&&!game.ended;
  const leadX=flying?clamp(p.vx*.035,-12,12):0;
  const leadY=flying?clamp(-p.vy*.025,-12,12):0;
  // Keep the body near the centre of the usable view, above the thumb controls.
  // Tall cliffs widen the view to show both the launch point and the water.
  const targetX=(highCliff?(p.x+Math.max(p.x,game.mat.x+75))/2:p.x+leadX)-view/2,targetY=highCliff?span/2-155*span/height:K_FLOOR-p.y+leadY-span*.065;
  const blend=snap?1:1-Math.exp(-16*dt);
  cameraSpan=span;camera+=(targetX-camera)*blend;cameraY+=(targetY-cameraY)*blend;
  // Bound tracking lag on fast launches, even on a narrow portrait screen.
  if(!highCliff)camera=clamp(camera,p.x-view*.59,p.x-view*.41);
  if(!highCliff)cameraY=clamp(cameraY,K_FLOOR-p.y-span*.14,K_FLOOR-p.y+span*.015);
}
function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;scale=height/480;graphics.resize();if(touchMode&&screen!=='menu')followMobilePlayer(0,true);}
new ResizeObserver(resize).observe(canvas);
function held(code){return keys.has(code)||touchKeys.has(code);}
function controls(){return{grab:held('ArrowUp'),bomb:held('KeyB')&&game.characterId==='bruno',dive:held('KeyF')&&campaign.trickUnlocked('deathdive'),special:held('KeyE'),grip:held('Space'),tuck:held('ArrowDown')||held('KeyS'),twist:Number(held('ArrowRight')||held('KeyD'))-Number(held('ArrowLeft')||held('KeyA'))};}
function clearInput(){if(game.grounded){game.groundHeld=false;game.groundCharge=0;}keys.clear();touchKeys.clear();touchPointers.clear();document.querySelectorAll('[data-key]').forEach(b=>{b.classList.remove('pressed');b.setAttribute('aria-pressed','false');});}
function setScreen(next){
  const previous=screen;if(next!==screen)sound.stop();screen=next;document.body.dataset.screen=next;clearInput();
  document.getElementById('target-guide').hidden=true;
  for(const name of ['menu','pause','result','guide','boards'])ui[name].hidden=next!==name;
  ui.hud.hidden=!['play','pause','result'].includes(next);ui.touch.hidden=next!=='play';
  if(next==='play'){canvas.focus();if(typeof leaderboardService!=='undefined'&&previous!=='pause')leaderboardService.start();}
  else if(next==='pause')document.getElementById('resume').focus();
  else if(next==='result')document.getElementById('again').focus();
}
const comboDisplay=document.getElementById('combo-display');
function clearCombo(){comboDisplay.hidden=true;comboDisplay.getAnimations({subtree:true}).forEach(a=>a.cancel());}
function showCombo(event){
  if(event.type==='chainBreak'){clearCombo();return;}
  comboDisplay.hidden=false;
  document.getElementById('combo-caption').textContent=event.chain>1?event.chain+' JUMP COMBO':'COMBO!';
  document.getElementById('combo-multiplier').textContent='×'+event.multiplier;
  document.getElementById('combo-bonus').textContent='+'+event.bonus+' BONUS';
  comboDisplay.style.setProperty('--combo-color',event.multiplier>=4?'#ff79ef':'#bcff58');
  comboDisplay.getAnimations({subtree:true}).forEach(a=>a.cancel());
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches){
    comboDisplay.animate([{transform:'scale(.55) rotate(-9deg)',opacity:0},{transform:'scale(1.2) rotate(3deg)',opacity:1,offset:.35},{transform:'scale(.96) rotate(-1deg)',offset:.65},{transform:'scale(1)',opacity:1}],{duration:520,easing:'cubic-bezier(.2,.8,.2,1)'});
    ui.score.animate([{transform:'scale(1)',color:'#fff'},{transform:'scale(1.3)',color:'#bcff58'},{transform:'scale(1)',color:'#fff'}],{duration:450});
    document.querySelectorAll('#combo-sparks i').forEach((spark,i)=>{
      const angle=i*Math.PI/6,dx=Math.cos(angle)*95,dy=Math.sin(angle)*66;
      spark.animate([{transform:'translate(0,0) scale(0)',opacity:1},{opacity:1,offset:.2},{transform:'translate('+dx+'px,'+dy+'px) rotate(160deg) scale(.2)',opacity:0}],{duration:650+i*15,easing:'ease-out'});
    });
  }
}
for(let i=0;i<12;i++)document.getElementById('combo-sparks').appendChild(document.createElement('i'));
function sync(){ui.score.textContent=game.score;ui.progress.textContent=game.sandbox?'∞':`${game.visited.size} / ${game.bars.length}`;ui['menu-best'].textContent=game.sandbox?'FREE PLAY':`BEST ${best}`;document.getElementById('hud-goal').textContent=(game.sandbox?'SANDBOX':`/ ${campaign.chapter(game.mapIndex).goal} PTS`)+(game.objectives.length?' · '+(game.map.challenge==='stars'?'STARS ':game.map.challenge==='window'?'WINDOW ':'FIRE ')+game.objectives.filter(o=>o.done).length+'/'+game.objectives.length:'')+(game.map.gravity?' · '+game.map.gravity+'× GRAVITY':'');}
function updateMapCarousel(){
  const courses=courseList(),count=courses.length,current=courses.findIndex(c=>c.map===game.mapIndex);
  document.querySelectorAll('[data-map]').forEach(button=>{
    const offset=Number(button.dataset.chapter)-current;
    const map=Number(button.dataset.map),locked=!canPlayMap(map);button.classList.toggle('locked',locked);button.querySelector('.map-info small').textContent=locked?'LOCKED':KAARI_MAPS[map].sandboxOnly?'FREE PLAY':campaign.cleared(map)?'★'.repeat(campaign.stars(map))+' · COMPLETE':'TARGET '+campaign.chapter(map).goal+' PTS';
    button.dataset.offset=offset;button.setAttribute('aria-pressed',String(offset===0));button.tabIndex=Math.abs(offset)<=2?0:-1;button.setAttribute('aria-hidden',String(Math.abs(offset)>2));
  });
  const section=courses.filter(c=>!!KAARI_MAPS[c.map].sandboxOnly===game.sandbox);document.getElementById('map-counter').textContent=`${String(section.findIndex(c=>c.map===game.mapIndex)+1).padStart(2,'0')} / ${String(section.length).padStart(2,'0')}`;
  document.getElementById('map-selected-name').textContent=game.map.name;document.getElementById('map-prev').disabled=current===0;document.getElementById('map-next').disabled=current===count-1;updateCampaignMenu();
}
function cycleMap(direction){const courses=courseList(),current=courses.findIndex(c=>c.map===game.mapIndex);reset(courses[clamp(current+direction,0,courses.length-1)].map);}
const mapTrack=document.getElementById('map-track');
function buildCourseCards(){mapTrack.replaceChildren();for(const [chapterIndex,chapter] of courseList().entries()){
  const index=chapter.map,map=KAARI_MAPS[index];
  const button=document.createElement('button');button.className=`map-card ${map.id}`;button.dataset.map=index;button.dataset.chapter=chapterIndex;button.type='button';
  button.setAttribute('aria-label',`${map.name}, ${map.description}`);
  button.innerHTML=`<span class="map-art"><img src="assets/maps/${map.id}.webp" alt="${map.name} course preview" loading="lazy"><b>${map.sandboxOnly?'∞':String(JUMPBAR_CHAPTERS.findIndex(c=>c.map===index)+1).padStart(2,'0')}</b></span><span class="map-info"><strong>${map.name}</strong><small>${map.description.split(' · ').slice(0,2).join(' · ')}</small></span>`;
  button.onclick=()=>{if(performance.now()>mapDrag.ignoreUntil)reset(index);};mapTrack.appendChild(button);
}
}
buildCourseCards();
const mapDrag={id:null,startX:0,startY:0,dx:0,dragging:false,ignoreUntil:0};
mapTrack.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0||mapDrag.id!==null)return;mapDrag.id=e.pointerId;mapDrag.startX=e.clientX;mapDrag.startY=e.clientY;mapDrag.dx=0;mapDrag.dragging=false;});
mapTrack.addEventListener('pointermove',e=>{if(e.pointerId!==mapDrag.id)return;mapDrag.dx=e.clientX-mapDrag.startX;if(!mapDrag.dragging&&Math.abs(mapDrag.dx)>8&&Math.abs(mapDrag.dx)>Math.abs(e.clientY-mapDrag.startY)){mapDrag.dragging=true;mapTrack.setPointerCapture(e.pointerId);mapTrack.classList.add('dragging');}if(mapDrag.dragging)mapTrack.style.setProperty('--drag',`${clamp(mapDrag.dx,-100,100)}px`);});
function endMapDrag(e){if(e.type==='lostpointercapture'&&e.target!==mapTrack)return;if(e.pointerId!==mapDrag.id)return;const swiped=mapDrag.dragging&&Math.abs(mapDrag.dx)>32;mapTrack.style.setProperty('--drag','0px');mapTrack.classList.remove('dragging');if(mapDrag.dragging)mapDrag.ignoreUntil=performance.now()+350;mapDrag.id=null;if(swiped&&e.type==='pointerup')cycleMap(mapDrag.dx<0?1:-1);}
for(const type of ['pointerup','pointercancel','lostpointercapture'])mapTrack.addEventListener(type,endMapDrag);
for(const [id,direction] of [['map-prev',-1],['map-next',1]]){const button=document.getElementById(id);button.addEventListener('pointerup',e=>{if(e.button!==0)return;e.preventDefault();cycleMap(direction);});button.onclick=e=>{if(e.detail===0)cycleMap(direction);};}
mapTrack.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();e.stopPropagation();cycleMap(e.code==='ArrowRight'?1:-1);}});
function reset(mapIndex=game.mapIndex){
  gameMode=KAARI_MAPS[mapIndex].sandboxOnly?'sandbox':'story';
  if(typeof leaderboardService!=='undefined')leaderboardService.reset();sound.stop();clearInput();clearCombo();game.reset(mapIndex,{sandbox:gameMode==='sandbox'});game.characterId=campaign.data.equipped;game.deathDiveUnlocked=campaign.trickUnlocked('deathdive');document.querySelector('[data-key=KeyB]').hidden=game.characterId!=='bruno';document.querySelector('[data-key=KeyF]').hidden=!game.deathDiveUnlocked;readBest();trail=[];particles=[];camera=0;cameraSpan=baseSpan();cameraY=cameraSpan/2-floorMargin(cameraSpan);ui['start-hint'].hidden=false;ui['start-hint'].innerHTML=initialStartHint;
  if(touchMode)followMobilePlayer(0,true);
  updateMapCarousel();sync();
}
function enterFullscreen(){if(!document.fullscreenElement&&document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});}
function start(){if(!canPlayMap(game.mapIndex)||!campaign.owns(selectedCharacter))return;reset();enterFullscreen();beginWithTutorials();}
function menu(){reset();setScreen('menu');}
function pause(){if(screen==='play'&&!game.ended)setScreen('pause');}
function resume(){if(game.player.bar>=0)game.active=false;setScreen('play');}
function step(dt){
  if(screen==='menu'){
    menuTime+=dt;const p=game.player,b=game.bars[0];p.angle=-.65+Math.sin(menuTime*1.4)*.38;p.tuck=(Math.sin(menuTime*1.4+.5)+1)*.35;p.radius=76-26*p.tuck;p.x=b.x+Math.sin(p.angle)*p.radius;p.y=b.y+Math.cos(p.angle)*p.radius;game.ragdoll.step(dt,p,b);return;
  }
  if(screen!=='play')return;
  particles.forEach(p=>{p.life-=dt;p.y-=24*dt;});particles=particles.filter(p=>p.life>0);
  game.step(dt,controls());sound.update(game,dt);ui['start-hint'].hidden=game.active&&!game.grounded;if(game.grounded)ui['start-hint'].textContent='TUCK → RELEASE · bounce back to the bar';
  document.querySelector('.special-control').classList.toggle('spent',game.specialAwarded);
  for(const event of game.events){
    sound.event(event,game);
    if(event.type==='respawn'){clearInput();trail=[];particles=[];ui['start-hint'].innerHTML=initialStartHint;ui['start-hint'].hidden=false;if(touchMode)followMobilePlayer(0,true);sync();continue;}
    if(event.type==='chain'||event.type==='chainBreak'){showCombo(event);
    }else if(event.type==='finish'){
      if(game.sandbox){clearInput();continue;}
      if(typeof leaderboardService!=='undefined')leaderboardService.finish();
      const reward=campaign.claim(game);saveCampaign();readBest();
      ui['result-label'].textContent=event.splash?(!event.success?'VISIT BOTH BARS':event.splash.kind==='bomb'?'CANNONBALL +200':event.splash.kind==='deathdive'?'DEATH DIVE +200':event.splash.clean?'CLEAN DIVE +200':'SPLASH!'):event.success?'CLEAN LANDING':event.crash.quip;ui['result-title'].textContent=event.splash?(event.success?'SPLASH!':'MISSED A BAR!'):event.success?'STUCK IT!':event.crash.title;if(!event.success&&game.visited.size===game.bars.length&&!game.objectives.every(o=>o.done)){ui['result-label'].textContent='SPECIAL OBJECTIVE MISSED';ui['result-title'].textContent=game.map.challenge==='stars'?'COLLECT ALL STARS!':game.map.challenge==='window'?'AIM FOR THE WINDOW!':'THROUGH THE FIRE!';}ui['result-score'].textContent=game.score;ui['result-copy'].textContent=`${game.visited.size} / ${game.bars.length} bars / best combo ${game.maxChain} · best ${best}`;
      if(reward){
        document.getElementById('result-reward').textContent='+'+reward.coins+' ◈ COINS';
        const chapter=campaign.chapter(game.mapIndex),cleared=campaign.cleared(game.mapIndex),index=JUMPBAR_CHAPTERS.indexOf(chapter);
        document.getElementById('result-unlock').textContent=reward.firstClear?(reward.allClear?'Story complete! SANDBOX UNLOCKED — 3 bonus maps and free play on every course.':'Chapter complete! The next course is unlocked.'):cleared?'Chapter complete · aim for more stars.':event.success?'Finished! Earn another '+reward.missing+' points in a single run.':'Reach the finish with '+chapter.goal+' points to unlock the next chapter.';
        document.getElementById('next-chapter').hidden=!cleared||index===JUMPBAR_CHAPTERS.length-1;
        if(!event.success&&game.visited.size===game.bars.length&&game.objectives.some(o=>!o.done))document.getElementById('result-unlock').textContent=game.map.challenge==='stars'?'Collect every sky star on your way down, then land in the water.':game.map.challenge==='window'?'Fly through the open window after catching both bars.':'Fall through the fire ring, then reach the finish.';
        if(reward.allClear&&reward.firstClear)ui['result-title'].textContent='CHAMPION!';
        if(reward.newChapter&&campaign.trickUnlocked('deathdive')&&!campaign.data.tutorialsSeen.includes('deathdive'))document.getElementById('result-unlock').textContent+=' NEW TRICK: Death dive!';
        updateCampaignMenu();
      }
      if(event.splash){particles.push({x:event.splash.x,y:K_FLOOR-60,label:!event.success?'SPLASH!':'+'+event.splash.points+' SPLASH!',life:1.6});clearInput();ui.touch.hidden=true;}
      if(event.crash){particles.push({x:event.crash.x,y:K_FLOOR-95,label:event.crash.sound,life:1.8});clearInput();ui.touch.hidden=true;}
    }else{const label=event.type==='special'?`+${event.points} ${event.label}`:event.type==='bounce'||event.type==='ground'||event.type==='collision'?event.label:event.type==='flip'?`+250 ${event.label}`:event.type==='twist'?`+200 ${event.label}`:event.type==='combo'?`COMBO +150 · ${event.label}`:'+100';if(event.type==='combo')particles=[];particles.push({x:event.x,y:event.y-40,label,life:event.type==='combo'?2:1.5});if(event.type==='catch')trail=[];}
    sync();
  }
  game.events=[];
  if(!game.sandbox&&game.ended&&game.elapsedAfterEnd>(game.splash?game.splash.duration:game.crash?game.crash.duration:1.1))setScreen('result');
  const p=game.player;
  if(p.bar<0&&!game.ended){trail.push({x:p.x,y:p.y});if(trail.length>30)trail.shift();}
  if(touchMode){followMobilePlayer(dt);return;}
  // Track high flights vertically and pull back enough to retain the floor.
  // Upward velocity gives the camera a short lead before the next apex.
  const nextBar=game.bars.find((_,i)=>!game.visited.has(i));
  const top=Math.max(330,p.bar>=0&&nextBar?K_FLOOR-nextBar.y+150:0,K_FLOOR-p.y+100+(p.bar<0?Math.max(0,-p.vy)*.12:0));
  const targetSpan=Math.max(baseSpan(),touchMode?(top+65)/(1-(height>width?155:115)/height):top+135),targetY=targetSpan/2-floorMargin(targetSpan);
  const response=targetSpan>cameraSpan?8:2.5;
  cameraSpan+=(targetSpan-cameraSpan)*(1-Math.exp(-response*dt));
  cameraY+=(targetY-cameraY)*(1-Math.exp(-response*dt));
  const view=width/height*cameraSpan,lead=p.bar<0?Math.max(0,p.vx)*.16:0;
  const target=p.x+lead-view*.4;camera+=(target-camera)*Math.min(1,dt*5);
}
function draw(){const inMenu=screen==='menu',offset=inMenu?game.player.x-width/scale*.72:camera;graphics.draw(game,offset,trail,particles,inMenu?160:cameraY,inMenu?480:cameraSpan);}
function releaseIfNeeded(){if(screen==='play'&&!held('Space')&&game.active)game.release();}
window.addEventListener('keydown',e=>{
  if(screen==='menu'&&['ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();cycleCharacter(e.code==='ArrowRight'?1:-1);return;}
  if(e.code==='Escape'){e.preventDefault();if(screen==='boards'){document.getElementById('boards-close').click();return;}if(screen==='guide'){closeGuide();return;}if(screen==='play')pause();else if(screen==='pause')resume();return;}
  if(screen!=='play')return;
  if(e.target instanceof HTMLElement&&e.target.matches('button,a,input'))return;
  if(['Space','ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys.add(e.code);
  if(e.code==='KeyR'){reset();canvas.focus();}
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')releaseIfNeeded();});
window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
// Resume freezes the attached pose until grip is pressed again, preventing an
// unavoidable fall after menus clear held keyboard/touch input.
document.getElementById('resume').onclick=resume;
canvas.addEventListener('pointerdown',()=>{if(screen==='play')canvas.focus();});
document.querySelectorAll('[data-key]').forEach(button=>{
  button.addEventListener('contextmenu',e=>e.preventDefault());
  button.addEventListener('pointerdown',e=>{if(screen!=='play')return;e.preventDefault();window.getSelection()?.removeAllRanges();button.setPointerCapture(e.pointerId);touchPointers.set(e.pointerId,button.dataset.key);touchKeys.add(button.dataset.key);button.classList.add('pressed');button.setAttribute('aria-pressed','true');});
  const up=e=>{
    if(!touchPointers.has(e.pointerId))return;
    touchPointers.delete(e.pointerId);
    if(![...touchPointers.values()].includes(button.dataset.key)){touchKeys.delete(button.dataset.key);button.classList.remove('pressed');button.setAttribute('aria-pressed','false');}
    if(e.type==='pointercancel'||e.type==='lostpointercapture'){pause();return;}
    if(button.dataset.key==='Space')releaseIfNeeded();
  };
  button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('lostpointercapture',up);
});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
for(const type of ['selectstart','contextmenu','dragstart'])document.getElementById('app').addEventListener(type,e=>{if(screen==='play')e.preventDefault();});
window.addEventListener('orientationchange',pause);
window.visualViewport?.addEventListener('resize',resize);

document.querySelectorAll('[data-menu]').forEach(button=>button.onclick=menu);
document.getElementById('next-chapter').onclick=()=>{const index=JUMPBAR_CHAPTERS.findIndex(c=>c.map===game.mapIndex);if(index<JUMPBAR_CHAPTERS.length-1&&campaign.available(JUMPBAR_CHAPTERS[index+1].map)){reset(JUMPBAR_CHAPTERS[index+1].map);selectCharacter(campaign.data.equipped);setScreen('menu');}};
document.getElementById('play').onclick=start;document.getElementById('pause-button').onclick=pause;
for(const id of ['restart','again','pause-restart'])document.getElementById(id).onclick=()=>{reset();beginWithTutorials();};
document.getElementById('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else enterFullscreen();};
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)pause();});
document.getElementById('help-toggle').onclick=()=>{const help=document.getElementById('help');help.hidden=!help.hidden;document.getElementById('help-toggle').setAttribute('aria-expanded',String(!help.hidden));};
let last=0,accumulator=0;function frame(time){if(last)accumulator+=Math.min((time-last)/1000,.05);last=time;while(accumulator>=1/120){step(1/120);accumulator-=1/120;}draw();if(typeof drawGuide==='function')drawGuide(time);requestAnimationFrame(frame);}reset(JUMPBAR_CHAPTERS[campaign.unlocked].map);setScreen('menu');requestAnimationFrame(frame);




