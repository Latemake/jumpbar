'use strict';
let guideTrick=null,guideStart=0,guideQueue=[],guideReturn='menu',guideTutorial=false;
function showTrick(id){
  guideTrick=JUMPBAR_TRICKS.find(t=>t.id===id)||JUMPBAR_TRICKS[0];guideStart=performance.now();
  const t=guideTrick,unlocked=campaign.trickUnlocked(t.id);
  document.getElementById('trick-name').textContent=t.name;
  document.getElementById('trick-state').textContent=unlocked?'UNLOCKED':'LOCKED';
  document.getElementById('trick-state').dataset.unlocked=unlocked;
  document.getElementById('trick-points').textContent=t.points;
  document.getElementById('trick-owners').textContent='WHO: '+(t.owners.length?t.owners.map(id=>JUMPBAR_CHARACTERS.find(c=>c.id===id).name).join(', '):'All characters');
  document.getElementById('trick-keys').textContent=t.keys;
  document.getElementById('trick-how').textContent=t.how;
  document.getElementById('trick-unlock').textContent=t.unlock;
  document.querySelectorAll('[data-trick]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.trick===t.id)));
  document.getElementById('tutorial-next').textContent=guideQueue.length>1?'NEXT TRICK →':'GOT IT · PLAY →';
}
function openGuide(tutorial=false){
  guideReturn=screen==='pause'?'pause':'menu';guideTutorial=tutorial;
  setScreen('guide');
  document.getElementById('guide').classList.toggle('is-tutorial',tutorial);
  document.getElementById('guide-title').textContent=tutorial?'New trick!':'Trick book';
  document.getElementById('guide-kicker').textContent=tutorial?'WATCH · LEARN · TRY':'THE JUMPBAR FIELD GUIDE';
  document.getElementById('tutorial-next').hidden=!tutorial;
  const list=document.getElementById('trick-list');list.replaceChildren();
  for(const t of JUMPBAR_TRICKS){const b=document.createElement('button');b.dataset.trick=t.id;const title=document.createElement('strong'),state=document.createElement('span');title.textContent=t.name;state.textContent=campaign.trickUnlocked(t.id)?'UNLOCKED':'LOCKED';b.append(title,state);b.onclick=()=>showTrick(t.id);list.appendChild(b);}
  showTrick(tutorial?guideQueue[0].id:'backflip');
  document.getElementById('guide-close').focus();
}
function beginWithTutorials(){guideQueue=campaign.pendingTutorials();if(guideQueue.length)openGuide(true);else setScreen('play');}
function closeGuide(){setScreen(guideReturn);if(guideReturn==='menu')document.getElementById('guide-open').focus();}
document.getElementById('guide-open').onclick=()=>{guideQueue=[];openGuide(false);};
document.getElementById('guide-close').onclick=closeGuide;
document.getElementById('demo-replay').onclick=()=>{guideStart=performance.now();};
document.getElementById('tutorial-next').onclick=()=>{
  campaign.acknowledgeTutorial(guideTrick.id);saveCampaign();guideQueue.shift();
  if(guideQueue.length)showTrick(guideQueue[0].id);else setScreen('play');
};
// A short, looping example driven by the same pose definitions as gameplay.
// It has no simulation, score, input or save side effects.
function drawGuide(now){
  if(screen!=='guide'||!guideTrick)return;
  const canvas=document.getElementById('trick-demo'),ctx=canvas.getContext('2d'),t=guideTrick;
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const u=reduce?.58:((now-guideStart)%4500)/4500;
  ctx.clearRect(0,0,520,230);ctx.fillStyle='#1d2143';ctx.fillRect(0,0,520,230);
  const water=['cannon','deathdive'].includes(t.demo),end=u>.86;
  ctx.fillStyle=water?'#35a6b5':'#657752';ctx.fillRect(0,194,520,36);
  ctx.strokeStyle='#a9dbe4';ctx.lineWidth=3;
  if(water)for(let i=0;i<10;i++){ctx.beginPath();ctx.moveTo(i*57,206);ctx.lineTo(i*57+27,206);ctx.stroke();}
  ctx.fillStyle='#939bc3';ctx.fillRect(50,76,5,118);ctx.fillRect(50,75,100,5);
  let x=105+u*300,y=115-Math.sin(u*Math.PI)*55+u*u*42,angle=0,tuck=0,pose=null;
  if(t.demo==='flip'||t.demo==='frontflip'){angle=u*Math.PI*2*(t.demo==='frontflip'?-1:1);tuck=u>.17&&u<.73?1:0;}
  if(t.demo==='layout')angle=u*Math.PI*2;
  if(t.demo==='candle')pose=u>.2?'candle':null;
  if(['salute','star'].includes(t.demo))pose=u>.2&&u<.8?t.demo:null;
  if(t.demo==='grab')pose=u>.2&&u<.8?'grab':null;
  if(t.demo==='pike')pose=u>.2&&u<.8?'pike':null;
  if(t.demo==='cannon'){tuck=u>.2?1:0;angle=.4;pose='cannon';}
  if(t.demo==='deathdive'){angle=u>.8?0:-Math.PI/2;tuck=u>.8?1:0;pose=u>.2&&u<.8?'deathdive':null;}
  if(t.demo==='bounce'){x=240;y=145+Math.sin(u*Math.PI*2)*35;tuck=u>.15&&u<.4?1:0;}
  const p={x,y,angle,tuck,specialPose:pose},j=new GymnastRagdoll(p).pose(p);
  ctx.save();if(t.demo==='twist'){ctx.translate(x,0);ctx.scale(.35+.65*Math.abs(Math.cos(u*Math.PI*4)),1);ctx.translate(-x,0);}
  const character=JUMPBAR_CHARACTERS.find(c=>c.id===t.owners[0])||JUMPBAR_CHARACTERS[0];
  const line=(a,b,width,color)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(j[a].x,j[a].y);ctx.lineTo(j[b].x,j[b].y);ctx.stroke();};
  if(!water||!end){
    for(const side of ['L','R']){line('hip','knee'+side,10,character.pants);line('knee'+side,'foot'+side,8,character.skin);line('chest','elbow'+side,7,character.skin);line('elbow'+side,'hand'+side,6,character.skin);}
    line('hip','chest',character.id==='bruno'?30:18,character.shirt);line('chest','head',7,character.skin);
    ctx.fillStyle=character.skin;ctx.beginPath();ctx.arc(j.head.x,j.head.y,10,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=character.hair;ctx.beginPath();ctx.arc(j.head.x,j.head.y-3,10,Math.PI,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  if(water&&end){ctx.strokeStyle='#defcff';ctx.lineWidth=3;const r=10+(u-.86)*150;ctx.beginPath();ctx.ellipse(390,196,r,r*.25,0,Math.PI*2);ctx.stroke();for(let i=0;i<7;i++){ctx.fillStyle='#defcff';ctx.beginPath();ctx.arc(390+(i-3)*10,185-Math.sin((u-.86)/.14*Math.PI)*(20+i%3*10),3,0,Math.PI*2);ctx.fill();}}
  const cue=u<.2?'1 · Release GRIP':u>.8?(t.demo==='deathdive'?'3 · Release DIVE + hold TUCK':water?'3 · Splash!':'3 · Open and land'):'2 · '+t.keys;
  document.getElementById('demo-cue').textContent=cue;
}
