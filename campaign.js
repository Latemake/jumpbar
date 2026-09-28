'use strict';
const JUMPBAR_CHAPTERS=[
  {map:0,title:'1 · Kalsareista kaikki alkaa',goal:900,reward:60,story:'Puiston tangot odottavat. Opettele rytmi ja laskeudu maaliin.'},
  {map:1,title:'2 · Ensimmäinen loiskaus',goal:1200,reward:80,story:'Rohkeutta rannalla. Yhdistä ilmassa temppu ja siisti vesihyppy.'},
  {map:4,title:'3 · Saariston kutsu',goal:1600,reward:100,story:'Saariston porukka haastaa sinut. Jatka comboa veteen asti.'},
  {map:2,title:'4 · Kultainen ilta',goal:2200,reward:120,story:'Kallioiden yllä on tilaa. Kokeile tuplavolttia ja erikoistemppua.'},
  {map:3,title:'5 · Kattojen kuningas',goal:3000,reward:160,story:'Kaupungin pitkä rata vaatii rytmiä. Pelasta putoaminen pompulla.'},
  {map:5,title:'6 · Viimeinen huippu',goal:3200,reward:200,story:'Vuoristojärven finaali. Näytä, mitä olet matkan varrella oppinut.'}
];
class JumpbarCampaign {
  constructor(saved=null){
    const chars=typeof JUMPBAR_CHARACTERS!=='undefined'?JUMPBAR_CHARACTERS:require('./physics').JUMPBAR_CHARACTERS;
    this.characters=chars;this.data={version:1,coins:0,owned:['rookie'],equipped:'rookie',records:{}};
    if(saved&&saved.version===1){
      const integer=n=>Number.isSafeInteger(n)&&n>=0?n:0;
      this.data.coins=integer(saved.coins);
      this.data.owned=['rookie',...chars.filter(c=>c.id!=='rookie'&&Array.isArray(saved.owned)&&saved.owned.includes(c.id)).map(c=>c.id)];
      this.data.equipped=this.data.owned.includes(saved.equipped)?saved.equipped:'rookie';
      for(const chapter of JUMPBAR_CHAPTERS){const r=saved.records?.[chapter.map];if(r&&typeof r==='object')this.data.records[chapter.map]={best:integer(r.best),successBest:integer(r.successBest)};}
    }
  }
  chapter(map){return JUMPBAR_CHAPTERS.find(c=>c.map===map);}
  get unlocked(){let n=0;while(n<JUMPBAR_CHAPTERS.length-1&&this.cleared(JUMPBAR_CHAPTERS[n].map))n++;return n;}
  available(map){const index=JUMPBAR_CHAPTERS.findIndex(c=>c.map===map);return index>=0&&index<=this.unlocked;}
  cleared(map){return(this.data.records[map]?.successBest||0)>=(this.chapter(map)?.goal||Infinity);}
  stars(map){const score=this.data.records[map]?.successBest||0,goal=this.chapter(map)?.goal||Infinity;return score>=goal*2?3:score>=goal*1.5?2:score>=goal?1:0;}
  owns(id){return this.data.owned.includes(id);}
  equip(id){if(!this.owns(id))return false;this.data.equipped=id;return true;}
  buy(id){
    const character=this.characters.find(c=>c.id===id);
    if(!character||this.owns(id)||this.data.coins<character.price)return false;
    this.data.coins-=character.price;this.data.owned.push(id);this.data.equipped=id;return true;
  }
  claim(game){
    if(!game.ended||game.rewardClaimed||!this.available(game.mapIndex))return null;
    game.rewardClaimed=true;
    const chapter=this.chapter(game.mapIndex),first=!this.cleared(game.mapIndex),oldUnlocked=this.unlocked;
    const score=Number.isFinite(game.score)?Math.max(0,Math.floor(game.score)):0;
    const record=this.data.records[game.mapIndex]||{best:0,successBest:0};record.best=Math.max(record.best,score);
    if(game.success)record.successBest=Math.max(record.successBest,score);
    this.data.records[game.mapIndex]=record;
    const cleared=game.success&&score>=chapter.goal,firstClear=first&&cleared;
    const trickCoins=Math.min(80,Math.floor(Math.max(0,score-(game.success?500:0))/100));
    const coins=trickCoins+(game.success?20:0)+(firstClear?chapter.reward:0);
    this.data.coins+=coins;
    return{coins,trickCoins,firstClear,cleared,newChapter:this.unlocked>oldUnlocked,allClear:JUMPBAR_CHAPTERS.every(c=>this.cleared(c.map)),missing:Math.max(0,chapter.goal-score)};
  }
}
if(typeof module!=='undefined')module.exports={JumpbarCampaign,JUMPBAR_CHAPTERS};
