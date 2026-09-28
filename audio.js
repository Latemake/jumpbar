'use strict';
// Recorded foley provides the texture; only the spring/slide whistle is synthesized.
class JumpbarAudio {
  constructor(){
    this.ctx=null;this.buffers=new Map();this.voices=new Set();this.last=new Map();this.serial=0;this.previous=null;this.cooldown=0;this.muted=false;this.volume=.7;
    try{const saved=JSON.parse(localStorage.getItem('jumpbar-audio')||'{}');this.muted=!!saved.muted;if(Number.isFinite(saved.volume))this.volume=Math.max(0,Math.min(1,saved.volume));}catch{}
    this.names=['impactMetal_light_000','impactMetal_light_001','impactSoft_heavy_000','impactSoft_heavy_001','impactPunch_medium_000','impactWood_light_000','impactTin_medium_000','impactTin_medium_001','impactBell_heavy_000','footstep_grass_000','footstep_snow_000','cloth1','cloth2','cloth3','knifeSlice','knifeSlice2','bookOpen','bookFlip1','bookClose','handleCoins','handleCoins2','metalPot1','creak1','splash','ocean','bubbles'];
  }
  unlock(){
    if(!this.ctx){
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
      this.ctx=new Context();this.master=this.ctx.createGain();this.compressor=this.ctx.createDynamicsCompressor();this.compressor.threshold.value=-16;this.compressor.ratio.value=5;this.compressor.attack.value=.003;this.compressor.release.value=.16;this.master.connect(this.compressor);this.compressor.connect(this.ctx.destination);this.applyVolume();
      this.loading=Promise.all(this.names.map(async name=>{try{const response=await fetch('assets/audio/'+name+'.wav');if(!response.ok)throw Error('audio missing');this.buffers.set(name,await this.ctx.decodeAudioData(await response.arrayBuffer()));}catch{/* Missing audio never blocks gameplay. */}}));
    }
    if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
  }
  applyVolume(){if(this.master)this.master.gain.setTargetAtTime(this.muted?0:this.volume,this.ctx.currentTime,.015);}
  save(){try{localStorage.setItem('jumpbar-audio',JSON.stringify({muted:this.muted,volume:this.volume}));}catch{}this.applyVolume();this.syncUI();}
  syncUI(){document.querySelectorAll('[data-sound]').forEach(b=>{b.textContent=this.muted?'♪×':'♪';b.setAttribute('aria-label',this.muted?'Unmute sound':'Mute sound');b.setAttribute('aria-pressed',String(this.muted));});const slider=document.getElementById('sound-volume');if(slider)slider.value=Math.round(this.volume*100);}
  stop(){for(const s of this.voices){try{s.stop();}catch{}}this.voices.clear();this.previous=null;}
  available(key,gap=.06){if(!this.ctx||this.muted||document.hidden||this.ctx.state!=='running')return false;const now=this.ctx.currentTime;if(now-(this.last.get(key)??-100)<gap)return false;this.last.set(key,now);return true;}
  pick(names){const key=names.join(),last=this.last.get(key),options=names.filter(n=>n!==last),name=(options.length?options:names)[Math.floor(Math.random()*(options.length||names.length))];this.last.set(key,name);return name;}
  sample(name,gain=.3,rate=1,delay=0,maxDuration=0){
    if(!this.ctx||this.muted||document.hidden||this.ctx.state!=='running'||this.voices.size>=16)return;
    const buffer=this.buffers.get(name);if(!buffer)return;
    const source=this.ctx.createBufferSource(),amp=this.ctx.createGain(),now=this.ctx.currentTime+delay;
    source.buffer=buffer;source.playbackRate.value=Math.max(.45,Math.min(2.5,rate));amp.gain.value=gain;source.connect(amp);amp.connect(this.master);this.voices.add(source);this.serial++;
    const duration=maxDuration?Math.min(maxDuration,buffer.duration/rate):buffer.duration/rate;
    amp.gain.setValueAtTime(gain,now);amp.gain.setValueAtTime(gain,now+Math.max(0,duration-.06));amp.gain.linearRampToValueAtTime(0,now+duration);
    source.onended=()=>{this.voices.delete(source);source.disconnect();amp.disconnect();};source.start(now);source.stop(now+duration+.01);
  }
  spring(pitch=1,whistle=false){
    if(!this.available(whistle?'whistle':'spring',.18))return;
    const sr=this.ctx.sampleRate,duration=whistle?.25:.42,buf=this.ctx.createBuffer(1,Math.ceil(sr*duration),sr),out=buf.getChannelData(0);let phase=0;
    for(let i=0;i<out.length;i++){const t=i/sr,u=t/duration,f=whistle?pitch*(1250+500*Math.sin(u*Math.PI)):pitch*(95+370*Math.exp(-u*5)+45*Math.sin(u*34)*Math.exp(-u*2));phase+=Math.PI*2*f/sr;const envelope=Math.min(1,t/.008)*Math.pow(1-u,1.6);out[i]=(Math.sin(phase)+.18*Math.sin(phase*2.01))*envelope*.48;}
    this.buffers.set('_spring',buf);this.sample('_spring',whistle?.18:.28);
  }
  character(id,quiet=false){const gain=quiet?.16:.3;if(id==='guard')this.spring(1,true);else if(id==='sauna')this.sample('metalPot1',gain,.85+Math.random()*.12,0,.65);else if(id==='diver')this.sample('cloth3',gain,.65);else if(id==='bruno')this.spring(.65);else this.sample('creak1',gain,1.45,0,.3);}
  ui(kind){if(!this.available('ui',.055))return;
    if(kind==='buy'){this.sample('handleCoins',.4);this.sample('impactBell_heavy_000',.1,1.5,.15,.45);}
    else if(kind==='open')this.sample('bookOpen',.4);
    else if(kind==='page')this.sample('bookFlip1',.25,1.15);
    else if(kind==='close')this.sample('bookClose',.3);
    else this.sample('impactWood_light_000',.18,1.3+Math.random()*.18);
  }
  update(game,dt){
    const p=game.player,old=this.previous;this.cooldown=Math.max(0,this.cooldown-dt);
    if(old&&!game.ended){
      if(old.bar>=0&&p.bar<0)this.sample(this.pick(['knifeSlice','knifeSlice2']),.28,.9+Math.random()*.2);
      if(old.bar<0&&p.bar>=0){this.sample(this.pick(['impactMetal_light_000','impactMetal_light_001']),.32,.9+Math.random()*.2);this.sample('cloth1',.2,1.2);}
      if((old.tuck<.5)!==(p.tuck<.5)&&this.available('tuck',.35))this.sample(this.pick(['cloth1','cloth2','cloth3']),.14,1.1);
      if(p.bar>=0&&old.angle*p.angle<0&&Math.abs(p.omega)>2&&this.cooldown===0){this.sample(this.pick(['knifeSlice','knifeSlice2']),Math.min(.35,Math.abs(p.omega)*.035),.8+Math.abs(p.omega)*.045);this.cooldown=.4;}
    }
    this.previous={bar:p.bar,tuck:p.tuck,angle:p.angle};
  }
  event(e,game){
    if(!this.ctx||this.muted)return;const pitch=game.characterId==='bruno'?.78:game.characterId==='sauna'?.87:1;
    if(e.type==='ground'){this.sample(this.pick(['impactSoft_heavy_000','impactSoft_heavy_001']),.42,pitch);this.sample(game.map.id==='alpine'?'footstep_snow_000':'footstep_grass_000',.23);}
    else if(e.type==='bounce'){this.spring(pitch);this.sample('cloth2',.2);}
    else if(e.type==='flip'||e.type==='twist'){if(this.available('spin',.15))this.sample(this.pick(['knifeSlice','knifeSlice2']),.26,e.type==='twist'?1.5:1.05);}
    else if(e.type==='special'){this.character(game.characterId);if(e.label==='GRAB')this.sample('cloth2',.28,.9);}
    else if(e.type==='chain'||e.type==='combo'){this.sample(this.pick(['impactTin_medium_000','impactTin_medium_001']),.25,1+Math.min(6,e.chain||2)*.15);this.sample('handleCoins2',.25,1.15,.09);}
    else if(e.type==='chainBreak')this.sample('cloth3',.15,.65);
    else if(e.type==='finish'){
      if(e.splash){const strength=e.splash.strength;this.sample(strength>1.45?'ocean':'splash',Math.min(.8,.3+strength*.18),Math.max(.68,1.17-strength*.16));this.sample('bubbles',.25,.9,.2,2.1);}
      else if(e.success){this.sample('impactSoft_heavy_000',.4,pitch);this.sample('handleCoins',.28,1.2,.25);}
      else{const kind=e.crash.kind;this.sample(kind==='belly'||kind==='back'?'impactPunch_medium_000':'impactSoft_heavy_001',.52,pitch);if(kind==='head')this.sample('impactTin_medium_001',.28,.85,.09);else if(kind==='roll'){this.sample('impactSoft_heavy_000',.25,pitch,.17);this.sample('impactSoft_heavy_001',.15,pitch,.34);}else this.spring(.7);if(game.characterId==='sauna')this.sample('metalPot1',.3,.85,.1,.8);}
    }
  }
}
const sound=new JumpbarAudio();
document.addEventListener('pointerdown',()=>sound.unlock(),{capture:true});
document.addEventListener('keydown',()=>sound.unlock(),{capture:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)sound.stop();});
window.addEventListener('blur',()=>sound.stop());
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.hasAttribute('data-sound')){sound.muted=!sound.muted;sound.stop();sound.save();return;}if(b.hasAttribute('data-key'))return;const id=b.id;sound.ui(id==='buy-character'?'buy':id==='guide-open'?'open':id==='guide-close'?'close':b.dataset.trick?'page':'click');if(id==='character-prev'||id==='character-next')sound.character(typeof selectedCharacter==='string'?selectedCharacter:'rookie',true);});
document.addEventListener('input',e=>{if(e.target.id==='sound-volume'){sound.volume=Number(e.target.value)/100;sound.save();}});
sound.syncUI();
