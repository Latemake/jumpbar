'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {JumpbarCampaign,JUMPBAR_CHAPTERS}=require('./campaign');
const {KaariPhysics}=require('./physics');
function result(map,score,success=true){const g=new KaariPhysics(map);g.ended=true;g.success=success;g.score=score;return g;}
test('campaign gates by a successful score and rewards a run once, with one first-clear bonus',()=>{
  const c=new JumpbarCampaign();assert.equal(c.unlocked,0);assert.deepEqual(c.data.owned,['rookie']);
  assert.equal(c.claim(result(1,5000)),null);
  const low=c.claim(result(0,699));assert.equal(low.cleared,false);assert.equal(c.unlocked,0);
  c.claim(result(0,9000,false));assert.equal(c.unlocked,0);
  const run=result(0,900),reward=c.claim(run),coins=c.data.coins;
  assert.equal(reward.firstClear,true);assert.equal(reward.newChapter,true);assert.equal(c.unlocked,1);assert.equal(c.stars(0),1);
  assert.equal(c.claim(run),null);assert.equal(c.data.coins,coins);
  const replay=c.claim(result(0,900));assert.equal(reward.coins-replay.coins,60);assert.equal(replay.firstClear,false);
});
test('purchases, equipped character and unlocked chapters survive a save/reload',()=>{
  const c=new JumpbarCampaign();assert.equal(c.buy('bruno'),false);assert.equal(c.equip('astro'),false);
  c.claim(result(0,900));assert.ok(c.data.coins>=80);assert.equal(c.buy('bruno'),true);
  const coins=c.data.coins;assert.equal(c.buy('bruno'),false);assert.equal(c.data.coins,coins);
  const restored=new JumpbarCampaign(JSON.parse(JSON.stringify(c.data)));
  assert.equal(restored.data.equipped,'bruno');assert.equal(restored.owns('bruno'),true);assert.equal(restored.data.coins,coins);assert.equal(restored.unlocked,1);
  assert.equal(restored.buy('unknown'),false);assert.equal(restored.equip('rookie'),true);
});
test('all chapters unlock in order and final completion supports star replays',()=>{
  const c=new JumpbarCampaign();
  for(const [i,ch] of JUMPBAR_CHAPTERS.entries()){
    assert.equal(c.unlocked,i);const reward=c.claim(result(ch.map,ch.goal*2));assert.equal(reward.cleared,true);assert.equal(c.stars(ch.map),3);
    assert.equal(reward.allClear,i===JUMPBAR_CHAPTERS.length-1);
  }
  assert.equal(c.unlocked,JUMPBAR_CHAPTERS.length-1);assert.equal(c.claim(result(0,900)).firstClear,false);
});
test('invalid saves and non-finite scores cannot create currency or equip unknown characters',()=>{
  const c=new JumpbarCampaign({version:1,coins:-200,owned:['missing'],equipped:'astro',records:{0:{best:Infinity,successBest:NaN}}});
  assert.equal(c.data.coins,0);assert.equal(c.unlocked,0);assert.equal(c.data.equipped,'rookie');
  c.claim(result(0,Infinity,false));assert.equal(c.data.coins,0);
  assert.equal(new JumpbarCampaign({version:99,coins:1000}).data.coins,0);
});

test('retired characters refund their purchase prices once and preserve chapter progress',()=>{
  const c=new JumpbarCampaign({version:1,coins:35,owned:['rookie','bruno','shadow','astro'],equipped:'astro',records:{0:{best:1500,successBest:1200}}});
  assert.equal(c.data.coins,1155);assert.deepEqual(c.data.owned,['rookie','bruno']);assert.equal(c.data.equipped,'rookie');assert.equal(c.unlocked,2);
  assert.equal(c.buy('astro'),false);assert.equal(c.buy('shadow'),false);
  const reloaded=new JumpbarCampaign(JSON.parse(JSON.stringify(c.data)));assert.equal(reloaded.data.coins,1155);assert.equal(reloaded.unlocked,2);
});

test('new trick tutorials queue only when unlocked and acknowledgements persist',()=>{
 const c=new JumpbarCampaign();assert.deepEqual(c.pendingTutorials().map(t=>t.id),['grab','candle']);
 assert.equal(c.acknowledgeTutorial('deathdive'),false);assert.equal(c.trickUnlocked('cannon'),false);
 c.acknowledgeTutorial('grab');c.acknowledgeTutorial('candle');c.claim(result(0,900));c.buy('bruno');
 assert.deepEqual(c.pendingTutorials().map(t=>t.id),['cannon']);
 c.claim(result(6,1100));c.claim(result(1,12000));assert.equal(c.trickUnlocked('deathdive'),true);
 assert.deepEqual(c.pendingTutorials().map(t=>t.id),['cannon','deathdive']);
 const restored=new JumpbarCampaign(JSON.parse(JSON.stringify(c.data)));
 assert.deepEqual(restored.pendingTutorials().map(t=>t.id),['cannon','deathdive']);
 restored.acknowledgeTutorial('cannon');restored.acknowledgeTutorial('deathdive');assert.equal(restored.pendingTutorials().length,0);
});

test('Neon retires with a single refund and new characters unlock their own tutorials',()=>{
 const c=new JumpbarCampaign({version:1,coins:1000,owned:['rookie','neon'],equipped:'neon',tutorialsSeen:['grab','candle','pike']});assert.equal(c.data.coins,1220);assert.equal(c.owns('neon'),false);assert.equal(c.data.equipped,'rookie');
 const saved=new JumpbarCampaign(JSON.parse(JSON.stringify(c.data)));assert.equal(saved.data.coins,1220);
 for(const [id,trick] of [['guard','salute'],['sauna','star'],['diver','pike']]){assert.equal(saved.buy(id),true);assert.equal(saved.trickUnlocked(trick),true);}
 assert.deepEqual(saved.pendingTutorials().map(t=>t.id),['salute','star','pike']);
});

test('expanded world keeps legacy coins, records, unlocked courses and death dive without fake clears',()=>{
 const old={version:1,coins:123,owned:['rookie','bruno'],equipped:'bruno',records:{0:{best:900,successBest:900},1:{best:950,successBest:950}}};
 const c=new JumpbarCampaign(old);assert.equal(c.data.coins,123);assert.equal(c.available(4),true);assert.equal(c.available(6),true);assert.equal(c.cleared(6),false);assert.equal(c.trickUnlocked('deathdive'),true);assert.equal(c.data.records[1].successBest,950);
 const restored=new JumpbarCampaign(c.data);assert.equal(restored.available(4),true);assert.equal(restored.trickUnlocked('deathdive'),true);assert.equal(restored.data.coins,123);
});

test('sandbox unlocks only after all story goals and never grants campaign coins',()=>{
 const c=new JumpbarCampaign();assert.equal(c.sandboxUnlocked,false);for(const [i,ch] of JUMPBAR_CHAPTERS.entries()){c.claim(result(ch.map,ch.goal));assert.equal(c.sandboxUnlocked,i===JUMPBAR_CHAPTERS.length-1);}assert.equal(new JumpbarCampaign(c.data).sandboxUnlocked,true);const coins=c.data.coins,run=result(11,99999);run.sandbox=true;assert.equal(c.claim(run),null);assert.equal(c.data.coins,coins);
});

test('reward codes ignore case and surrounding whitespace and unlock a persistent character once',()=>{
 const c=new JumpbarCampaign();const original=JSON.stringify(c.data);for(const code of ['','wrong','__proto__','constructor',null]){assert.equal(c.redeemCode(code).status,'invalid');assert.equal(JSON.stringify(c.data),original);}assert.equal(c.buy('arjun'),false);assert.equal(c.redeemCode('  StArT26  ').ok,true);assert.equal(c.owns('arjun'),true);assert.equal(c.data.equipped,'arjun');assert.equal(c.trickUnlocked('serve'),true);assert.equal(c.pendingTutorials().some(t=>t.id==='serve'),true);assert.equal(c.data.coins,0);for(const code of ['start26','START26','sTaRt26'])assert.equal(c.redeemCode(code).status,'already');assert.equal(c.data.owned.filter(c=>c==='arjun').length,1);const loaded=new JumpbarCampaign(JSON.parse(JSON.stringify(c.data)));assert.equal(loaded.owns('arjun'),true);assert.equal(loaded.redeemCode('START26').status,'already');assert.equal(loaded.data.equipped,'arjun');assert.equal(loaded.data.coins,0);
});

test('JUMP67 unlocks every map persistently without inventing scores or coins',()=>{
 const c=new JumpbarCampaign();assert.equal(c.redeemCode('  JuMp67 ').status,'levels');
 for(const chapter of JUMPBAR_CHAPTERS){assert.equal(c.available(chapter.map),true);assert.equal(c.cleared(chapter.map),false);}
 assert.equal(c.sandboxUnlocked,true);assert.equal(c.data.coins,0);assert.deepEqual(c.data.records,{});
 const loaded=new JumpbarCampaign(JSON.parse(JSON.stringify(c.data)));assert.equal(loaded.sandboxUnlocked,true);assert.equal(loaded.unlocked,JUMPBAR_CHAPTERS.length-1);assert.equal(loaded.redeemCode('JUMP67').status,'already');
});
test('RESET only requests confirmation; explicit reset clears campaign and permits redeeming again',()=>{
 const c=new JumpbarCampaign();c.redeemCode('start26');c.redeemCode('jump67');c.data.coins=900;c.data.records[0]={best:1000,successBest:1000};c.acknowledgeTutorial('grab');
 const before=JSON.stringify(c.data);assert.equal(c.redeemCode(' ReSeT ').status,'confirm-reset');assert.equal(JSON.stringify(c.data),before);
 c.resetProgress();assert.deepEqual(c.data,new JumpbarCampaign().data);assert.equal(c.sandboxUnlocked,false);assert.equal(c.unlocked,0);
 assert.deepEqual(new JumpbarCampaign(JSON.parse(JSON.stringify(c.data))).data,c.data);
 assert.equal(c.redeemCode('START26').ok,true);assert.equal(c.redeemCode('JUMP67').ok,true);
});
