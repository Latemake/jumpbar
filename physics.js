'use strict';
const KAARI_MAPS = [
  {id:'garden',name:'Puistotreeni',description:'Helppo · 5 tankoa · opettele keräasennon rytmi',points:[[180,220],[325,220],[480,205],[635,220],[795,210]],landing:240,colors:['#e7ecdf','#dbe3d2','#dee6d4','#d1ddc6','#809273']},
  {id:'coast',name:'Rantakaari',description:'Keskitaso · 7 tankoa · korkeuseroja ja pidempiä lentoja',points:[[180,225],[355,200],[540,225],[725,180],[910,210],[1105,190],[1300,215]],landing:260,colors:['#e2edf0','#d1e0e4','#c8dde2','#c2d5d4','#6d919d']},
  {id:'sunset',name:'Auringonlasku',description:'Haastava · 8 tankoa · pitkät välit ja tarkat irrotukset',points:[[180,220],[380,195],[600,230],[810,180],[1040,215],[1250,175],[1480,215],[1700,195]],landing:280,colors:['#f2e7df','#e8d7ca','#e5cdb9','#d9c4ae','#ab836e']}
];
const K_TAU=Math.PI*2,K_G=720,K_FLOOR=475;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

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
    const thigh=.025+2.12*t,shin=.025-1.15*t;
    const knee=[25*Math.sin(thigh),4+25*Math.cos(thigh)];
    const foot=[knee[0]+25*Math.sin(shin),knee[1]+25*Math.cos(shin)];
    const hand=bar?[(bar.x-p.x)*c-(bar.y-p.y)*s,(bar.x-p.x)*s+(bar.y-p.y)*c]:[0,-65];
    const dx=hand[0],dy=hand[1]+21,d=Math.hypot(dx,dy)||1;
    const bend=Math.sqrt(Math.max(0,23*23-Math.min(d,46)**2/4));
    const side=dy<=0?1:-1;
    const elbow=[dx/2-dy/d*bend*side,-21+dy/2+dx/d*bend*side];
    const local={hip:[0,4],chest:[0,-21],head:[0,-38],elbowL:elbow,elbowR:[...elbow],handL:hand,handR:[...hand],kneeL:knee,kneeR:[...knee],footL:foot,footR:[...foot]};
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
  step(dt,p,bar){
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
        for(const name of ['elbow','hand']){const a=this.joints[name+'L'],b=this.joints[name+'R'];a.x=b.x=(a.x+b.x)/2;a.y=b.y=(a.y+b.y)/2;}
        if(bar)for(const id of ['handL','handR']){this.joints[id].x=bar.x;this.joints[id].y=bar.y;}
      }
      for(const q of Object.values(this.joints))if(q.y>K_FLOOR-4){q.y=K_FLOOR-4;q.px=q.x-(q.x-q.px)*.7;q.py=q.y;}
    }
  }
}

class KaariPhysics {
  constructor(mapIndex=0){this.reset(mapIndex);}
  reset(mapIndex=this.mapIndex){
    this.mapIndex=clamp(mapIndex,0,KAARI_MAPS.length-1);this.map=KAARI_MAPS[this.mapIndex];this.bars=this.map.points.map(([x,y])=>({x,y:y+55}));this.mat={x:this.bars.at(-1).x+65,w:this.map.landing+80};
    const b=this.bars[0],angle=-.85;
    this.player={x:b.x+Math.sin(angle)*76,y:b.y+Math.cos(angle)*76,vx:0,vy:0,angle,omega:0,radius:76,tuck:0,bar:0,cooldown:0,momentum:0,twist:0,twistSpeed:0};
    this.ragdoll=new GymnastRagdoll(this.player);this.visited=new Set([0]);this.score=0;this.airRotation=0;this.turns=0;this.twistTurns=0;this.comboAwarded=false;this.events=[];this.ended=false;this.success=false;this.active=false;this.elapsedAfterEnd=0;this.crash=null;
  }
  inertia(tuck){return 1-.65*tuck;}
  release(){
    const p=this.player;if(p.bar<0||this.ended)return;
    p.vx=Math.cos(p.angle)*p.radius*p.omega;p.vy=-Math.sin(p.angle)*p.radius*p.omega;
    p.momentum=p.omega*this.inertia(p.tuck);p.bar=-1;p.cooldown=.22;this.airRotation=0;this.turns=0;this.twistTurns=0;this.comboAwarded=false;p.twist=0;p.twistSpeed=0;
  }
  finish(success){
    if(this.ended)return;this.ended=true;this.success=success;
    if(success){this.score+=500;this.player.vx=0;this.player.vy=0;this.player.twist=0;this.player.twistSpeed=0;this.player.angle=0;this.player.tuck=0;this.player.y=K_FLOOR-56;this.ragdoll.reset(this.player);}else{
      const p=this.player;
      const kind=p.tuck>.55||Math.abs(p.omega)>7?'roll':Math.cos(p.angle)<-.45?'head':Math.sin(p.angle)<-.55?'belly':Math.sin(p.angle)>.55?'back':'sit';
      const captions={head:['NUPPI EDELLÄ!','Ajatus katkesi hetkeksi.','POKS!'],belly:['MAHALASKU!','Täydet pisteet pinta-alasta.','LÄTS!'],back:['SELKÄPOMPPU!','Maa palautti lähettäjälle.','BOING!'],roll:['PYYKKILINKO!','Vielä yksi kierros, kiitos.','HURRR!'],sit:['PYLLÄHDYS!','Istumapaikka löytyi.','TÖMPS!']};
      const [title,quip,sound]=captions[kind];this.crash={kind,title,quip,sound,x:p.x,direction:p.vx<0?-1:1,kicked:false,duration:2.35};
      this.ragdoll.fall(p.vx,p.vy,kind);
    }
    this.events.push({type:'finish',success,crash:this.crash});
  }
  step(dt,input={}){
    const p=this.player;if(this.ended){
      this.elapsedAfterEnd+=dt;
      if(this.crash&&!this.crash.kicked&&this.elapsedAfterEnd>.32){this.ragdoll.kick(this.crash.kind,this.crash.direction);this.crash.kicked=true;}
      this.ragdoll.step(dt,p,null);
      if(this.crash){p.x=this.ragdoll.joints.hip.x;p.y=this.ragdoll.joints.hip.y;p.vx=0;p.vy=0;}
      return;
    }
    if(!this.active){if(input.grip||input.tuck)this.active=true;else return;}
    const oldRadius=p.radius;p.tuck+=(Number(!!input.tuck)-p.tuck)*Math.min(1,dt*10);p.radius=76-26*p.tuck;p.cooldown-=dt;
    if(p.bar>=0){
      p.twist=0;p.twistSpeed=0;
      // Variable-length pendulum: conserve radius² * angular speed when tucking.
      // Gravity supplies torque; directional keys never add energy.
      const angularMomentum=p.omega*oldRadius*oldRadius;
      p.omega=(angularMomentum-K_G*p.radius*Math.sin(p.angle)*dt)/(p.radius*p.radius);p.omega*=Math.exp(-.045*dt);p.omega=clamp(p.omega,-14,14);p.angle+=p.omega*dt;
      const b=this.bars[p.bar];p.x=b.x+Math.sin(p.angle)*p.radius;p.y=b.y+Math.cos(p.angle)*p.radius;if(!input.grip)this.release();
    }else{
      const twistInput=clamp(Number(input.twist)||0,-1,1);
      const twistTarget=twistInput*(8+4*p.tuck);
      p.twistSpeed+=(twistTarget-p.twistSpeed)*(1-Math.exp(-10*dt));
      p.twist+=p.twistSpeed*dt;
      p.vy+=K_G*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
      p.omega=p.momentum/this.inertia(p.tuck);
      // Opening the body above the landing mat gently brakes the spin and
      // aligns the feet. Tucking still leaves aerial tricks fully manual.
      const overMat=p.x>this.mat.x-25&&p.x<this.mat.x+this.mat.w+25;
      if(overMat&&p.vy>0&&p.y>K_FLOOR-190&&!input.tuck&&p.tuck<.4){
        const error=Math.atan2(Math.sin(p.angle),Math.cos(p.angle));
        p.omega+=(-22*error-8*p.omega)*dt;p.momentum=p.omega*this.inertia(p.tuck);
      }
      const rotation=p.omega*dt;p.angle+=rotation;this.airRotation+=rotation;
      const completed=Math.floor(Math.abs(this.airRotation)/K_TAU);
      if(completed>this.turns){this.score+=250*(completed-this.turns);this.turns=completed;this.events.push({type:'flip',label:this.airRotation>0?'BACKFLIP':'FRONTFLIP',x:p.x,y:p.y});}
      const twists=Math.floor(Math.abs(p.twist)/K_TAU);
      if(twists>this.twistTurns){this.score+=200*(twists-this.twistTurns);this.twistTurns=twists;this.events.push({type:'twist',label:`${twists*360}°`,x:p.x,y:p.y});}
      if(this.turns>0&&this.twistTurns>0&&!this.comboAwarded){this.comboAwarded=true;this.score+=150;this.events.push({type:'combo',label:`${this.airRotation>0?'BACKFLIP':'FRONTFLIP'} ${this.twistTurns*360}°`,x:p.x,y:p.y-25});}
      if(input.grip&&p.cooldown<=0){
        const hand=this.ragdoll.pose(p).handR;
        for(let i=0;i<this.bars.length;i++){
          const b=this.bars[i];if(Math.hypot(hand.x-b.x,hand.y-b.y)>42)continue;
          p.angle=Math.atan2(p.x-b.x,p.y-b.y);p.omega=(p.vx*Math.cos(p.angle)-p.vy*Math.sin(p.angle))/p.radius;p.bar=i;p.twist=0;p.twistSpeed=0;p.x=b.x+Math.sin(p.angle)*p.radius;p.y=b.y+Math.cos(p.angle)*p.radius;
          if(!this.visited.has(i)){this.visited.add(i);this.score+=100;this.events.push({type:'catch',index:i,x:b.x,y:b.y});}break;
        }
      }
    }
    this.ragdoll.step(dt,p,p.bar>=0?this.bars[p.bar]:null);
    if(p.bar<0){
      const joints=this.ragdoll.joints,touching=Object.entries(joints).filter(([,q])=>q.y>=K_FLOOR-4.1);
      if(touching.length){const feet=[joints.footL,joints.footR],onMat=feet.every(q=>q.x>=this.mat.x-12&&q.x<=this.mat.x+this.mat.w+12),feetFirst=touching.every(([id])=>id.startsWith('foot')||id.startsWith('knee'));this.finish(feetFirst&&onMat&&Math.cos(p.angle)>.55&&Math.abs(p.omega)<9&&p.tuck<.6&&this.visited.size===this.bars.length);}
      if(p.y>K_FLOOR+80||p.y<-650||p.x<-180||p.x>this.mat.x+this.mat.w+200)this.finish(false);
    }
  }
}
if(typeof module!=='undefined')module.exports={KaariPhysics,GymnastRagdoll,KAARI_MAPS,K_FLOOR};

