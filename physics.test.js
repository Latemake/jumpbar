'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {KaariPhysics,GymnastRagdoll,KAARI_MAPS,K_FLOOR}=require('./physics');
const dt=1/120;
test('air twists combine with backflips, brake on release, and preserve the 2D trajectory',()=>{
  const plain=new KaariPhysics(),twisted=new KaariPhysics();
  for(const g of [plain,twisted]){g.active=true;Object.assign(g.player,{bar:-1,x:500,y:-200,vx:0,vy:-200,momentum:4.5,tuck:1});g.ragdoll.reset(g.player);}
  for(let i=0;i<120;i++){plain.step(dt,{tuck:true});twisted.step(dt,{tuck:true,twist:1});}
  assert.equal(twisted.player.x,plain.player.x);assert.equal(twisted.player.y,plain.player.y);assert.equal(twisted.player.angle,plain.player.angle);
  assert.ok(twisted.twistTurns>=1);assert.equal(twisted.events.filter(e=>e.type==='combo').length,1);
  assert.ok(twisted.events.some(e=>e.type==='combo'&&e.label.startsWith('BACKFLIP')));
  assert.equal(twisted.score-plain.score,twisted.twistTurns*200+150);
  assert.equal(twisted.flightPoints,twisted.score);
  assert.equal(plain.flightPoints,plain.score);
  for(let i=0;i<60;i++)twisted.step(dt,{tuck:true,twist:0});
  assert.ok(Math.abs(twisted.player.twistSpeed)<.1);
  assert.equal(twisted.events.filter(e=>e.type==='combo').length,1);
  twisted.reset();assert.equal(twisted.player.twist,0);assert.equal(twisted.twistTurns,0);
});
test('left twist works and attached gymnast cannot farm twist points',()=>{
  const g=new KaariPhysics();for(let i=0;i<120;i++)g.step(dt,{grip:true,twist:-1});
  assert.equal(g.player.twist,0);assert.equal(g.score,0);
  Object.assign(g.player,{bar:-1,x:500,y:-200,vy:-200,momentum:0});
  for(let i=0;i<120;i++)g.step(dt,{twist:-1});
  assert.ok(g.player.twist<-Math.PI*2);assert.equal(g.score,200);
});
test('five crash poses produce distinct reactions, settle, and reset cleanly',()=>{
  const cases=[['head',Math.PI,0,0],['belly',-Math.PI/2,0,0],['back',Math.PI/2,0,0],['roll',0,.9,8],['sit',0,0,0]];
  const signatures=[];
  for(const [kind,angle,tuck,omega] of cases){
    const g=new KaariPhysics();Object.assign(g.player,{x:300,y:410,angle,tuck,omega,vx:140,vy:300});g.ragdoll.reset(g.player);g.finish(false);
    assert.equal(g.crash.kind,kind);assert.equal(g.events.filter(e=>e.type==='finish').length,1);
    for(let i=0;i<60;i++)g.step(dt);
    signatures.push(Math.round(g.ragdoll.joints.head.x));
    assert.equal(g.crash.kicked,true);assert.equal(g.score,0);
    for(let i=0;i<900;i++)g.step(dt);
    for(const q of Object.values(g.ragdoll.joints)){assert.ok(Number.isFinite(q.x)&&Number.isFinite(q.y));assert.ok(q.y<=K_FLOOR);}
    for(const [a,b,len] of g.ragdoll.bones){const qa=g.ragdoll.joints[a],qb=g.ragdoll.joints[b];assert.ok(Math.abs(Math.hypot(qa.x-qb.x,qa.y-qb.y)-len)<2);}
    g.reset();assert.equal(g.crash,null);assert.equal(g.elapsedAfterEnd,0);assert.equal(g.ragdoll.fallen,false);
  }
  assert.ok(new Set(signatures).size>=4);
});
test('arms bend together throughout tuck, flight and grip at different rotations',()=>{
  for(const angle of [0,.7,-1.3,Math.PI])for(const tuck of [0,.5,1])for(const attached of [false,true]){
    const p={x:300,y:200,angle,tuck},radius=76-26*tuck;
    const bar=attached?{x:p.x-Math.sin(angle)*radius,y:p.y-Math.cos(angle)*radius}:null;
    const doll=new GymnastRagdoll(p);
    for(let i=0;i<90;i++)doll.step(dt,p,bar);
    for(const name of ['elbow','hand']){const a=doll.joints[name+'L'],b=doll.joints[name+'R'];assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<.1);}
    if(bar)assert.ok(Math.hypot(doll.joints.handL.x-bar.x,doll.joints.handL.y-bar.y)<.01);
  }
});
test('landing assist forgives a tilted opening but not head-first falls or skipped bars',()=>{
  function fall(angle,allBars=true){
    const g=new KaariPhysics();g.active=true;
    if(allBars)g.visited=new Set(g.bars.map((_,i)=>i));
    Object.assign(g.player,{bar:-1,x:g.mat.x+100,y:K_FLOOR-95,vx:50,vy:100,angle,momentum:4,tuck:.3});
    if(angle===Math.PI)Object.assign(g.player,{y:K_FLOOR-40,vy:300,tuck:0});
    g.ragdoll.reset(g.player);
    for(let i=0;i<180&&!g.ended;i++)g.step(dt,{tuck:false});return g;
  }
  assert.equal(fall(.75).success,true);
  assert.equal(fall(Math.PI).success,false);
  assert.equal(fall(.75,false).success,false);
});
test('both knees tuck toward the chest and heels fold back at every body rotation',()=>{
  for(const angle of [0,.8,-1.4,Math.PI,4.7]){
    const p={x:300,y:200,angle,tuck:1},doll=new GymnastRagdoll(p);
    for(let i=0;i<120;i++)doll.step(dt,p,null);
    const hip=doll.joints.hip;
    const local=q=>({x:(q.x-hip.x)*Math.cos(angle)-(q.y-hip.y)*Math.sin(angle),y:(q.x-hip.x)*Math.sin(angle)+(q.y-hip.y)*Math.cos(angle)});
    for(const side of ['L','R']){const knee=local(doll.joints['knee'+side]),foot=local(doll.joints['foot'+side]);assert.ok(knee.x>15,'knee on front side');assert.ok(knee.y<-8,'knee lifted toward chest');assert.ok(foot.x<knee.x-15,'heel folds back');}
    assert.ok(Math.hypot(doll.joints.kneeL.x-doll.joints.kneeR.x,doll.joints.kneeL.y-doll.joints.kneeR.y)<2,'legs stay together');
  }
});
function pump(game,steps,mode='timed'){
  let peak=0;
  for(let i=0;i<steps;i++){
    game.step(dt,{grip:true,tuck:mode==='constant'||mode==='timed'&&Math.abs(Math.sin(game.player.angle))<.45});
    peak=Math.max(peak,Math.abs(game.player.omega)*game.player.radius);
  }
  return peak;
}
function launchSamples(){
  const game=new KaariPhysics(),samples=[];
  for(let i=0;i<3600;i++){
    pump(game,1);const p=game.player,a=(p.angle%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
    if(i%3===0&&p.omega>0&&a>.05&&a<1.5)samples.push({...p});
  }
  return samples;
}
function launch(map,bar,state){
  const game=new KaariPhysics(map),b=game.bars[bar];game.active=true;
  Object.assign(game.player,state,{bar,x:b.x+Math.sin(state.angle)*state.radius,y:b.y+Math.cos(state.angle)*state.radius});
  game.ragdoll.reset(game.player);game.release();return game;
}
test('timed posture changes build momentum; a held posture does not',()=>{
  const timed=pump(new KaariPhysics(),1800),straight=pump(new KaariPhysics(),1800,'straight'),constant=pump(new KaariPhysics(),1800,'constant');
  assert.ok(timed>straight*2);assert.ok(timed>constant*2);
});
test('airborne tuck increases spin without changing the ballistic trajectory',()=>{
  const straight=new KaariPhysics(),tucked=new KaariPhysics();
  for(const game of [straight,tucked]){game.active=true;Object.assign(game.player,{bar:-1,x:300,y:120,vx:200,vy:-150,momentum:3});game.ragdoll.reset(game.player);}
  for(let i=0;i<30;i++){straight.step(dt,{tuck:false});tucked.step(dt,{tuck:true});}
  assert.ok(tucked.player.omega>straight.player.omega*2);assert.equal(straight.player.x,tucked.player.x);assert.equal(straight.player.y,tucked.player.y);
  assert.ok(Math.abs(tucked.player.omega*tucked.inertia(tucked.player.tuck)-3)<1e-10);
});
test('all map gaps and final landings are reachable from pumped launch states',()=>{
  const samples=launchSamples();
  for(let map=0;map<KAARI_MAPS.length;map++){
    const count=KAARI_MAPS[map].points.length;
    for(let bar=0;bar<count-1;bar++){
      let reachable=false;
      search:for(const state of samples)for(const tuckTime of [0,.15,.3,.5,.8]){
        const game=launch(map,bar,state);
        for(let i=0;i<180&&!game.ended;i++){
          game.step(dt,{grip:true,tuck:i*dt<tuckTime});
          if(game.player.bar===bar+1){reachable=true;assert.equal(game.score>=100,true);break search;}
          if(game.player.bar>=0)break;
        }
      }
      assert.ok(reachable,`map ${map}, gap ${bar}`);
    }
    let landed=false;
    search:for(const state of samples)for(let tuckTime=0;tuckTime<1.5;tuckTime+=.05){
      const game=launch(map,count-1,state);game.visited=new Set(game.bars.map((_,i)=>i));
      for(let i=0;i<240&&!game.ended;i++)game.step(dt,{tuck:i*dt<tuckTime});
      if(game.success){assert.ok(game.score>=500);landed=true;break search;}
    }
    assert.ok(landed,`map ${map}, final landing`);
  }
});
test('a fall leaves a finite, connected ragdoll above the floor',()=>{
  const game=new KaariPhysics();game.player.vx=250;game.finish(false);
  for(let i=0;i<1200;i++)game.step(dt);
  assert.equal(game.ragdoll.fallen,true);
  for(const q of Object.values(game.ragdoll.joints)){assert.ok(Number.isFinite(q.x)&&Number.isFinite(q.y));assert.ok(q.y<=K_FLOOR);}
  for(const [a,b,length] of game.ragdoll.bones){const qa=game.ragdoll.joints[a],qb=game.ragdoll.joints[b];assert.ok(Math.abs(Math.hypot(qa.x-qb.x,qa.y-qb.y)-length)<2);}
});
test('map changes clear score, progress, fall state and momentum',()=>{
  const game=new KaariPhysics();pump(game,500);game.score=500;game.finish(false);game.reset(2);
  assert.equal(game.bars.length,2);assert.equal(game.visited.size,1);assert.equal(game.score,0);assert.equal(game.player.omega,0);assert.equal(game.ended,false);assert.equal(game.ragdoll.fallen,false);
});

test('combo chains reward consecutive trick transfers, cap at x6 and reject repeat bars',()=>{
  const g=new KaariPhysics(3);g.active=true;
  function catchBar(index,points){
    Object.assign(g.player,{bar:-1,x:g.bars[index].x,y:g.bars[index].y+76,angle:0,twist:0,twistSpeed:0,vx:0,vy:0,momentum:0,tuck:0,cooldown:0});
    g.airRotation=0;g.turns=0;g.twistTurns=0;g.flightPoints=points;
    g.ragdoll.reset(g.player);g.step(0,{grip:true});
    assert.equal(g.player.bar,index);
  }
  catchBar(1,250);assert.equal(g.chain,1);assert.equal(g.score,350);
  catchBar(2,600);assert.equal(g.chain,2);assert.equal(g.score,1650);
  catchBar(2,250);assert.equal(g.chain,0);assert.equal(g.score,1650);
  catchBar(3,250);assert.equal(g.chain,1);
  catchBar(4,0);assert.equal(g.chain,0);
  catchBar(5,200);assert.equal(g.chain,1);
  g.flightPoints=250;g.finish(false);assert.equal(g.chain,0);assert.equal(g.maxChain,2);
  g.reset();assert.equal(g.maxChain,0);assert.equal(g.flightPoints,0);
  for(let i=0;i<8;i++){g.flightPoints=250;g.settleCombo(true);}
  assert.equal(g.events.at(-1).multiplier,6);assert.equal(g.events.at(-1).bonus,1250);
  g.flightPoints=200;const before=g.score;g.finish(true);assert.equal(g.score-before,1500);
});

test('air tuck folds hands to shins with bent elbows while bar tuck retains grip',()=>{
  for(const angle of [0,.8,-1.4,Math.PI,4.7]){
    const p={x:300,y:150,angle,tuck:1},doll=new GymnastRagdoll(p);
    for(let i=0;i<90;i++)doll.step(dt,p,null);
    const j=doll.joints;
    assert.ok(Math.hypot(j.handR.x-j.kneeR.x,j.handR.y-j.kneeR.y)<12);
    assert.ok(Math.hypot(j.handR.x-j.chest.x,j.handR.y-j.chest.y)<32);
    const bar={x:p.x-Math.sin(angle)*50,y:p.y-Math.cos(angle)*50};
    for(let i=0;i<90;i++)doll.step(dt,p,bar);
    assert.ok(Math.hypot(doll.joints.handR.x-bar.x,doll.joints.handR.y-bar.y)<.01);
    p.tuck=0;
    for(let i=0;i<90;i++)doll.step(dt,p,null);
    assert.ok(Math.hypot(doll.joints.handR.x-doll.joints.chest.x,doll.joints.handR.y-doll.joints.chest.y)>40);
  }
});

test('two bar courses and four water courses with forgiving entries and clean-dive bonuses',()=>{
  assert.equal(KAARI_MAPS.filter(m=>m.mode!=='dive').length,2);
  assert.equal(KAARI_MAPS.filter(m=>m.mode==='dive').length,4);
  for(const [index,map] of KAARI_MAPS.entries())if(map.mode==='dive'){
    for(const angle of [0,Math.PI,Math.PI/2]){
      const g=new KaariPhysics(index);g.active=true;g.visited=new Set([0,1]);
      Object.assign(g.player,{bar:-1,x:g.mat.x+180,y:K_FLOOR-70,angle,tuck:0,vx:0,vy:180,momentum:0});g.ragdoll.reset(g.player);
      for(let i=0;i<120&&!g.ended;i++)g.step(dt);
      assert.equal(g.success,true);assert.ok(g.splash);assert.equal(g.crash,null);
      assert.equal(g.splash.clean,angle!==Math.PI/2);assert.equal(g.score,angle===Math.PI/2?500:700);
      const score=g.score;for(let i=0;i<240;i++)g.step(dt);assert.equal(g.score,score);
      g.reset();assert.equal(g.splash,null);assert.equal(g.ended,false);
    }
    for(const missedBar of [false,true]){
      const g=new KaariPhysics(index);g.active=true;if(!missedBar)g.visited=new Set([0,1]);
      Object.assign(g.player,{bar:-1,x:missedBar?g.mat.x+180:200,y:missedBar?K_FLOOR-65:g.cliffY-65,angle:0,tuck:0,vx:0,vy:100,momentum:0});g.ragdoll.reset(g.player);
      for(let i=0;i<120&&!g.ended;i++)g.step(dt);
      assert.equal(g.success,false);assert.equal(g.ended,true);
    }
  }
});
