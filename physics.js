'use strict';
const KAARI_MAPS = [
  {id:'garden',name:'Park Practice',description:'Easy · 5 bars · find your rhythm',points:[[180,220],[325,220],[480,205],[635,220],[795,210]],landing:240,colors:['#e7ecdf','#dbe3d2','#dee6d4','#d1ddc6','#809273']},
  {id:'coast',mode:'dive',name:'Turquoise Bay',description:'Water jump · 2 bars · trick and splash',points:[[180,80],[335,65]],landing:1100,colors:['#e2edf0','#d1e0e4','#c8dde2','#c2d5d4','#6d919d']},
  {id:'sunset',mode:'dive',name:'Golden Cliffs',description:'Water jump · 2 bars · trick and splash',points:[[180,60],[350,40]],landing:1100,colors:['#f2e7df','#e8d7ca','#e5cdb9','#d9c4ae','#ab836e']},
  {id:'city',name:'Rooftop Run',description:'Medium · 7 bars · above the skyline',points:[[180,210],[350,190],[530,215],[720,180],[910,205],[1090,185],[1280,210]],landing:280,colors:['#aaa9db','#c4bfe5','#8298ba','#87819d','#535774']},
  {id:'harbor',mode:'dive',name:'Island Hopping',description:'Water jump · 2 bars · trick and splash',points:[[180,80],[310,95]],landing:1100,colors:['#a9d6de','#c8e5e5','#6c9baa','#93aeb2','#536d79']},
  {id:'alpine',mode:'dive',name:'Alpine Lake',description:'Water jump · 2 bars · trick and splash',points:[[180,50],[335,35]],landing:1100,colors:['#c7e3f6','#e1edf6','#b8d3e3','#e6edf0','#8195ac']}
];
const K_TAU=Math.PI*2,K_G=720,K_FLOOR=475;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const JUMPBAR_CHARACTERS=[
  {id:'rookie',name:'Boxer Barry',style:'Big dreams. Questionable underwear.',price:0,body:1,bare:true,skin:'#dfa77f',shirt:'#dfa77f',pants:'#f4eee3',shoe:'#dfa77f',hair:'#6a422b',badge:'',ability:'Candle',instruction:'Hold TRICK without tucking for 0.4 s in the air.',special:'candle',specialPoints:100,spin:1,bounce:1},
  {id:'bruno',name:'Big Bruno',style:'Big belly. Bigger bounce.',price:80,body:1.65,bare:true,skin:'#b97953',shirt:'#b97953',pants:'#e96b57',shoe:'#f6d569',hair:'#4b3027',badge:'',ability:'Cannonball',instruction:'Hold TRICK + TUCK for 0.4 s in the air.',special:'cannon',specialPoints:150,spin:.9,bounce:1.12},
  {id:'neon',name:'Neon',style:'Light on her feet. Quick in the air.',price:220,body:.82,skin:'#88563e',shirt:'#26d6bf',pants:'#432969',shoe:'#f0ff8f',hair:'#251b35',badge:'N',ability:'Pike',instruction:'Hold TRICK without tucking for 0.4 s in the air.',special:'pike',specialPoints:175,spin:1.15,bounce:1},
];

// Distance-constrained Verlet skeleton. Pose muscles switch off after a fall.
class GymnastRagdoll {
  constructor(p){
    this.bones=[['hip','chest',25],['chest','head',17],['chest','elbowL',23],['elbowL','handL',23],['chest','elbowR',23],['elbowR','handR',23],['hip','kneeL',25],['kneeL','footL',25],['hip','kneeR',25],['kneeR','footR',25]];
    this.joints={};this.reset(p);
  }
  pose(p,bar=null){
    const t=p.tuck,s=Math.sin(p.angle),c=Math.cos(p.angle);
    // Both thighs flex toward the chest in body space. The shins fold back
    // toward the hips; neither leg mirrors to the other side of the body.
    const special=!bar?p.specialPose:null;
    const thigh=special==='pike'?1.85:.025+2.12*t,shin=special==='pike'?1.85:.025-1.15*t;
    const knee=[25*Math.sin(thigh),4+25*Math.cos(thigh)];
    const foot=[knee[0]+25*Math.sin(shin),knee[1]+25*Math.cos(shin)];
    // In flight the hands fold towards the shins. A held bar keeps the grip
    // fixed instead; blend with tuck so opening the body also opens the arms.
    const fold=t*t*(3-2*t);
    const hand=bar?[(bar.x-p.x)*c-(bar.y-p.y)*s,(bar.x-p.x)*s+(bar.y-p.y)*c]:special==='pike'?[36,-22]:special==='star'?[39,-40]:special==='candle'?[5,20]:[(knee[0]+2)*fold,-65+(knee[1]+69)*fold];
    const dx=hand[0],dy=hand[1]+21,d=Math.hypot(dx,dy)||1;
    const bend=Math.sqrt(Math.max(0,23*23-Math.min(d,46)**2/4));
    const side=bar?(dy<=0?1:-1):-1;
    const elbow=[dx/2-dy/d*bend*side,-21+dy/2+dx/d*bend*side];
    const local={hip:[0,4],chest:[0,-21],head:[0,-38],elbowL:elbow,elbowR:[...elbow],handL:hand,handR:[...hand],kneeL:knee,kneeR:[...knee],footL:foot,footR:[...foot]};
    if(special==='star'){
      local.handL=[-39,-40];local.elbowL=[-20,-32];local.elbowR=[20,-32];
      local.kneeL=[-15,24];local.kneeR=[15,24];local.footL=[-30,44];local.footR=[30,44];
    }
    return Object.fromEntries(Object.entries(local).map(([id,[x,y]])=>[id,{x:p.x+x*c+y*s,y:p.y-x*s+y*c}]));
  }
  reset(p){for(const [id,q] of Object.entries(this.pose(p)))this.joints[id]={...q,px:q.x,py:q.y};this.fallen=false;}
  fall(vx,vy,kind='slump'){
    this.fallen=true;
    const bounce={head:170,belly:65,back:210,roll:120,sit:95,slump:0}[kind];
    const spin={head:4,belly:0,back:-2,roll:8,sit:-1,slump:0}[kind]*(vx<0?-1:1);
    const hip=this.joints.hip;
    for(const q of Object.values(this.joints)){
      const dx=q.x-hip.x,dy=q.y-hip.y;
      q.px=q.x-(clamp(vx,-380,380)*.6-dy*spin)/120;
      q.py=q.y-((kind==='slump'?clamp(vy,-700,700):-bounce)+dx*spin)/120;
    }
  }
  kick(kind,direction){
    for(const [id,q] of Object.entries(this.joints)){
      if(kind==='back'){q.py+=90/120;}
      if(kind==='belly'&&(id.startsWith('foot')||id.startsWith('knee'))){q.py+=170/120;}
      if(kind==='sit'&&id.startsWith('hand')){q.py+=230/120;q.px-=direction*100/120;}
      if(kind==='head'||kind==='roll'){const hip=this.joints.hip;q.px+=(q.y-hip.y)*direction*2/120;q.py-=(q.x-hip.x)*direction*2/120;}
    }
  }
  step(dt,p,bar,floor=K_FLOOR){
    const target=this.pose(p,bar);
    for(const [id,q] of Object.entries(this.joints)){
      const damping=this.fallen?.992:.90,vx=(q.x-q.px)*damping,vy=(q.y-q.py)*damping;q.px=q.x;q.py=q.y;
      const muscle=this.fallen?0:(id==='hip'||id==='chest'?650:340);
      q.x+=vx+(target[id].x-q.x)*muscle*dt*dt;q.y+=vy+((target[id].y-q.y)*muscle+(this.fallen?K_G:100))*dt*dt;
    }
    for(let pass=0;pass<9;pass++){
      for(const [a,b,len] of this.bones){const qa=this.joints[a],qb=this.joints[b],dx=qb.x-qa.x,dy=qb.y-qa.y,distance=Math.hypot(dx,dy)||1,correction=(distance-len)/distance*.5;qa.x+=dx*correction;qa.y+=dy*correction;qb.x-=dx*correction;qb.y-=dy*correction;}
      if(!this.fallen){
        for(const id of ['hip','chest']){const q=this.joints[id];q.x+=(target[id].x-q.x)*.25;q.y+=(target[id].y-q.y)*.25;}
        // Active leg muscles keep the knee bend on the anatomical front side.
        for(const id of ['kneeL','kneeR','footL','footR']){const q=this.joints[id];q.x+=(target[id].x-q.x)*.18;q.y+=(target[id].y-q.y)*.18;}
        for(const id of ['elbowL','elbowR','handL','handR']){const q=this.joints[id];q.x+=(target[id].x-q.x)*.22;q.y+=(target[id].y-q.y)*.22;}
        // The arms share one bend in the movement plane; depth separates them
        // visually. Do not constrain the free ragdoll after a fall.
        if(p.specialPose!=='star'||bar)for(const name of ['elbow','hand']){const a=this.joints[name+'L'],b=this.joints[name+'R'];a.x=b.x=(a.x+b.x)/2;a.y=b.y=(a.y+b.y)/2;}
        if(bar)for(const id of ['handL','handR']){this.joints[id].x=bar.x;this.joints[id].y=bar.y;}
      }
      for(const q of Object.values(this.joints))if(q.y>floor-4){q.y=floor-4;q.px=q.x-(q.x-q.px)*.7;q.py=q.y;}
    }
  }
}

class KaariPhysics {
  constructor(mapIndex=0){this.characterId='rookie';this.reset(mapIndex);}
  get character(){return JUMPBAR_CHARACTERS.find(c=>c.id===this.characterId)||JUMPBAR_CHARACTERS[0];}
  reset(mapIndex=this.mapIndex){
    this.mapIndex=clamp(mapIndex,0,KAARI_MAPS.length-1);this.map=KAARI_MAPS[this.mapIndex];this.bars=this.map.points.map(([x,y])=>({x,y:y+55}));this.mat={x:this.bars.at(-1).x+65,w:this.map.landing+80};
    this.water=this.map.mode==='dive';this.cliffY=K_FLOOR-180;this.splash=null;
    if(this.water)this.mat.x=this.bars.at(-1).x+45;
    const b=this.bars[0],angle=-.85;
    this.player={x:b.x+Math.sin(angle)*76,y:b.y+Math.cos(angle)*76,vx:0,vy:0,angle,omega:0,radius:76,tuck:0,bar:0,cooldown:0,momentum:0,twist:0,twistSpeed:0};
    this.ragdoll=new GymnastRagdoll(this.player);this.visited=new Set([0]);this.score=0;this.chain=0;this.maxChain=0;this.flightPoints=0;this.airRotation=0;this.turns=0;this.twistTurns=0;this.comboAwarded=false;this.events=[];this.ended=false;this.success=false;this.active=false;this.elapsedAfterEnd=0;this.crash=null;
    this.grounded=false;this.groundCharge=0;this.groundHeld=false;this.specialTime=0;this.specialAwarded=false;this.airTime=0;this.layoutRotation=0;this.layoutAwarded=false;this.rewardClaimed=false;
  }
  beginFlight(){
    this.flightPoints=0;this.airRotation=0;this.turns=0;this.twistTurns=0;this.comboAwarded=false;
    this.specialTime=0;this.specialAwarded=false;this.airTime=0;this.layoutRotation=0;this.layoutAwarded=false;this.player.specialPose=null;this.player.twist=0;this.player.twistSpeed=0;
  }
  stepGround(dt,input){
    const p=this.player,surface=this.water?this.cliffY:K_FLOOR;
    if(input.tuck){this.groundCharge=this.groundHeld?this.groundCharge+dt:dt;this.groundHeld=true;}
    else if(this.groundHeld){
      const quick=this.groundCharge>=.035&&this.groundCharge<=.6;
      this.groundHeld=false;this.groundCharge=0;
      if(quick){
        this.grounded=false;this.beginFlight();p.angle=0;p.momentum=0;p.vy=-530*this.character.bounce;p.cooldown=.12;
        const target=this.bars.find((_,i)=>!this.visited.has(i))||{x:this.mat.x+80,y:surface-65};
        p.vx=clamp((target.x-p.x)/.9,-240,240);p.y-=5;
        this.events.push({type:'bounce',label:'BOUNCE!',x:p.x,y:p.y});return;
      }
    }
    p.angle=0;p.omega=0;p.vx=0;p.vy=0;p.specialPose=null;
    const footY=this.ragdoll.pose({...p,y:0}).footR.y;p.y=surface-5-footY;
    this.ragdoll.step(dt,p,null,surface);
  }
  inertia(tuck){return 1-.65*tuck;}
  settleCombo(validTarget){
    if(validTarget&&this.flightPoints>0){
      this.chain++;this.maxChain=Math.max(this.maxChain,this.chain);
      const multiplier=Math.min(6,this.chain+1),bonus=this.flightPoints*(multiplier-1);
      this.score+=bonus;
      this.events.push({type:'chain',chain:this.chain,multiplier,bonus});
    }else{
      if(this.chain)this.events.push({type:'chainBreak'});
      this.chain=0;
    }
    this.flightPoints=0;
  }
  release(){
    const p=this.player;if(p.bar<0||this.ended)return;
    p.vx=Math.cos(p.angle)*p.radius*p.omega;p.vy=-Math.sin(p.angle)*p.radius*p.omega;
    p.momentum=p.omega*this.inertia(p.tuck);p.bar=-1;p.cooldown=.22;this.flightPoints=0;this.airRotation=0;this.turns=0;this.twistTurns=0;this.comboAwarded=false;p.twist=0;p.twistSpeed=0;
    this.beginFlight();
  }
  finish(success){
    if(this.ended)return;this.ended=true;this.success=success;this.settleCombo(success);
    if(this.water&&this.player.x>=this.mat.x&&this.player.x<=this.mat.x+this.mat.w){
      const p=this.player,clean=Math.abs(Math.cos(p.angle))>.82&&p.tuck<.5;
      this.splash={x:p.x,clean,duration:1.8};if(success)this.score+=500+(clean?200:0);p.vx=0;p.vy=0;
    }else if(success){this.score+=500;this.player.vx=0;this.player.vy=0;this.player.twist=0;this.player.twistSpeed=0;this.player.angle=0;this.player.tuck=0;this.player.y=K_FLOOR-56;this.ragdoll.reset(this.player);}else{
      const p=this.player;
      const kind=p.tuck>.55||Math.abs(p.omega)>7?'roll':Math.cos(p.angle)<-.45?'head':Math.sin(p.angle)<-.55?'belly':Math.sin(p.angle)>.55?'back':'sit';
      const captions={head:['HEAD FIRST!','Brain temporarily disconnected.','BONK!'],belly:['BELLY FLOP!','Full marks for surface area.','SPLAT!'],back:['BACK BOUNCE!','Returned to sender.','BOING!'],roll:['SPIN CYCLE!','One more spin, please.','WHIRR!'],sit:['BUTT FIRST!','Found a seat.','THUMP!']};
      const [title,quip,sound]=captions[kind];this.crash={kind,title,quip,sound,x:p.x,direction:p.vx<0?-1:1,kicked:false,duration:2.35};
      this.ragdoll.fall(p.vx,p.vy,kind);
    }
    this.events.push({type:'finish',success,crash:this.crash,splash:this.splash});
  }
  step(dt,input={}){
    const p=this.player;if(this.ended){
      this.elapsedAfterEnd+=dt;
      if(this.splash)return;
      if(this.crash&&!this.crash.kicked&&this.elapsedAfterEnd>.32){this.ragdoll.kick(this.crash.kind,this.crash.direction);this.crash.kicked=true;}
      this.ragdoll.step(dt,p,null,this.water&&p.x<this.mat.x?this.cliffY:K_FLOOR);
      if(this.crash){p.x=this.ragdoll.joints.hip.x;p.y=this.ragdoll.joints.hip.y;p.vx=0;p.vy=0;}
      return;
    }
    if(!this.active){if(input.grip||input.tuck)this.active=true;else return;}
    const oldRadius=p.radius;p.tuck+=(Number(!!input.tuck)-p.tuck)*Math.min(1,dt*10);p.radius=76-26*p.tuck;p.cooldown-=dt;
    if(this.grounded){this.stepGround(dt,input);return;}
    if(p.bar>=0){
      p.specialPose=null;
      p.twist=0;p.twistSpeed=0;
      // Variable-length pendulum: conserve radius² * angular speed when tucking.
      // Gravity supplies torque; directional keys never add energy.
      const angularMomentum=p.omega*oldRadius*oldRadius;
      p.omega=(angularMomentum-K_G*p.radius*Math.sin(p.angle)*dt)/(p.radius*p.radius);p.omega*=Math.exp(-.045*dt);p.omega=clamp(p.omega,-14,14);p.angle+=p.omega*dt;
      const b=this.bars[p.bar];p.x=b.x+Math.sin(p.angle)*p.radius;p.y=b.y+Math.cos(p.angle)*p.radius;if(!input.grip)this.release();
    }else{
      const twistInput=clamp(Number(input.twist)||0,-1,1);
      const twistTarget=twistInput*(8+4*p.tuck)*this.character.spin;
      p.twistSpeed+=(twistTarget-p.twistSpeed)*(1-Math.exp(-10*dt));
      p.twist+=p.twistSpeed*dt;
      p.vy+=K_G*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
      p.omega=p.momentum/this.inertia(p.tuck);
      // Opening the body above the landing mat gently brakes the spin and
      // aligns the feet. Tucking still leaves aerial tricks fully manual.
      const groundSurface=this.water?this.cliffY:K_FLOOR,overGround=!this.water||p.x<this.mat.x;
      if(overGround&&p.vy>0&&p.y>groundSurface-195&&!input.tuck&&p.tuck<.5&&Math.cos(p.angle)>-.35){
        const error=Math.atan2(Math.sin(p.angle),Math.cos(p.angle));
        p.omega+=(-32*error-11*p.omega)*dt;p.momentum=p.omega*this.inertia(p.tuck);
      }
      const rotation=p.omega*dt;p.angle+=rotation;this.airRotation+=rotation;
      const completed=Math.floor(Math.abs(this.airRotation)/K_TAU);
      if(completed>this.turns){this.flightPoints+=250*(completed-this.turns);this.score+=250*(completed-this.turns);this.turns=completed;this.events.push({type:'flip',label:(completed>1?completed+'× ':'')+(this.airRotation>0?'BACKFLIP':'FRONTFLIP'),x:p.x,y:p.y});}
      if(p.tuck<.2)this.layoutRotation+=Math.abs(rotation);else this.layoutRotation=0;
      if(this.layoutRotation>=K_TAU&&!this.layoutAwarded){this.layoutAwarded=true;this.score+=150;this.flightPoints+=150;this.events.push({type:'special',label:'LAYOUT FLIP',points:150,x:p.x,y:p.y});}
      const twists=Math.floor(Math.abs(p.twist)/K_TAU);
      if(twists>this.twistTurns){this.flightPoints+=200*(twists-this.twistTurns);this.score+=200*(twists-this.twistTurns);this.twistTurns=twists;this.events.push({type:'twist',label:`${twists*360}°`,x:p.x,y:p.y});}
      if(this.turns>0&&this.twistTurns>0&&!this.comboAwarded){this.comboAwarded=true;this.flightPoints+=150;this.score+=150;this.events.push({type:'combo',label:`${this.airRotation>0?'BACKFLIP':'FRONTFLIP'} ${this.twistTurns*360}°`,x:p.x,y:p.y-25});}
      this.airTime+=dt;
      const ability=this.character,canPose=input.special&&(ability.special==='cannon'?p.tuck>.65:ability.special==='corkscrew'||p.tuck<.35);
      p.specialPose=canPose?ability.special:null;
      const clearOfGround=p.y<(overGround?groundSurface:K_FLOOR)-95;
      this.specialTime=canPose&&clearOfGround?this.specialTime+dt:0;
      const ready=ability.special==='corkscrew'?this.turns>0&&this.twistTurns>0&&!!twistInput:this.specialTime>=.4;
      if(canPose&&ready&&clearOfGround&&!this.specialAwarded){
        this.specialAwarded=true;this.score+=ability.specialPoints;this.flightPoints+=ability.specialPoints;
        this.events.push({type:'special',label:ability.ability.toUpperCase(),points:ability.specialPoints,x:p.x,y:p.y});
      }
      if(input.grip&&p.cooldown<=0){
        // Grip input reaches for the bar even while the aerial pose is tucked.
        const hand=this.ragdoll.pose({...p,tuck:0,specialPose:null}).handR;
        for(let i=0;i<this.bars.length;i++){
          const b=this.bars[i];if(Math.hypot(hand.x-b.x,hand.y-b.y)>42)continue;
          p.angle=Math.atan2(p.x-b.x,p.y-b.y);p.omega=(p.vx*Math.cos(p.angle)-p.vy*Math.sin(p.angle))/p.radius;p.bar=i;p.twist=0;p.twistSpeed=0;p.x=b.x+Math.sin(p.angle)*p.radius;p.y=b.y+Math.cos(p.angle)*p.radius;
          p.specialPose=null;
          this.settleCombo(!this.visited.has(i));
          if(!this.visited.has(i)){this.visited.add(i);this.score+=100;this.events.push({type:'catch',index:i,x:b.x,y:b.y});}break;
        }
      }
    }
    const surface=this.water&&p.x<this.mat.x?this.cliffY:K_FLOOR;
    this.ragdoll.step(dt,p,p.bar>=0?this.bars[p.bar]:null,surface);
    if(p.bar<0){
      const joints=this.ragdoll.joints,touching=Object.entries(joints).filter(([,q])=>q.y>=surface-4.1);
      if(touching.length&&this.water&&p.x>=this.mat.x){
        const inWater=p.x>=this.mat.x&&p.x<=this.mat.x+this.mat.w;
        this.finish(inWater&&this.visited.size===this.bars.length);
      }else if(touching.length){
        const feet=[joints.footL,joints.footR],onMat=!this.water&&feet.every(q=>q.x>=this.mat.x-24&&q.x<=this.mat.x+this.mat.w+24);
        const feetFirst=touching.every(([id])=>id.startsWith('foot')||id.startsWith('knee'))&&Math.cos(p.angle)>.25&&Math.abs(p.omega)<12&&p.tuck<.8;
        if(feetFirst&&onMat&&this.visited.size===this.bars.length)this.finish(true);
        else if(feetFirst){
          this.settleCombo(false);this.grounded=true;this.groundCharge=0;this.groundHeld=false;p.specialPose=null;p.twist=0;p.twistSpeed=0;p.angle=0;p.tuck=0;p.y=surface-56;
          this.ragdoll.reset(p);this.events.push({type:'ground',label:'TUCK → RELEASE',x:p.x,y:p.y});
        }else this.finish(false);
      }
      if(p.y>K_FLOOR+80||p.y<-650||p.x<-180||p.x>this.mat.x+this.mat.w+200)this.finish(false);
    }
  }
}
if(typeof module!=='undefined')module.exports={KaariPhysics,GymnastRagdoll,KAARI_MAPS,JUMPBAR_CHARACTERS,K_FLOOR};

