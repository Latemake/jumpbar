'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {JumpbarCampaign,JUMPBAR_CHAPTERS}=require('./campaign');
const {KaariPhysics}=require('./physics');
function result(map,score,success=true){const g=new KaariPhysics(map);g.ended=true;g.success=success;g.score=score;return g;}
test('campaign gates by a successful score and rewards a run once, with one first-clear bonus',()=>{
  const c=new JumpbarCampaign();assert.equal(c.unlocked,0);assert.deepEqual(c.data.owned,['rookie']);
  assert.equal(c.claim(result(1,5000)),null);
  const low=c.claim(result(0,899));assert.equal(low.cleared,false);assert.equal(c.unlocked,0);
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
  assert.equal(c.unlocked,5);assert.equal(c.claim(result(0,900)).firstClear,false);
});
test('invalid saves and non-finite scores cannot create currency or equip unknown characters',()=>{
  const c=new JumpbarCampaign({version:1,coins:-200,owned:['missing'],equipped:'astro',records:{0:{best:Infinity,successBest:NaN}}});
  assert.equal(c.data.coins,0);assert.equal(c.unlocked,0);assert.equal(c.data.equipped,'rookie');
  c.claim(result(0,Infinity,false));assert.equal(c.data.coins,0);
  assert.equal(new JumpbarCampaign({version:99,coins:1000}).data.coins,0);
});

test('retired characters refund their purchase prices once and preserve chapter progress',()=>{
  const c=new JumpbarCampaign({version:1,coins:35,owned:['rookie','bruno','shadow','astro'],equipped:'astro',records:{0:{best:1500,successBest:1200}}});
  assert.equal(c.data.coins,1155);assert.deepEqual(c.data.owned,['rookie','bruno']);assert.equal(c.data.equipped,'rookie');assert.equal(c.unlocked,1);
  assert.equal(c.buy('astro'),false);assert.equal(c.buy('shadow'),false);
  const reloaded=new JumpbarCampaign(JSON.parse(JSON.stringify(c.data)));assert.equal(reloaded.data.coins,1155);assert.equal(reloaded.unlocked,1);
});
