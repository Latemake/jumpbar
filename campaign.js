'use strict';
const JUMPBAR_CHAPTERS=[
  {map:0,title:'1 · Humble Underwear',goal:700,reward:60,story:'Three close bars and a wide mat. Catch every bar and land — no flips required.'},
  {map:6,title:'2 · Flip Academy',goal:1000,reward:70,story:'SPECIAL · Warm up in the gym. Fall through the fire ring and stick the landing.'},
  {map:1,title:'3 · Beach Day',goal:1100,reward:80,story:'Leave the gym behind. Swing over the sand and splash into turquoise water.'},
  {map:4,title:'4 · Pebble Cove',goal:1400,reward:100,story:'SPECIAL · Collect both sky stars above the low granite ledge.'},
  {map:2,title:'5 · Amber Arch',goal:1800,reward:120,story:'A much higher cliff. Use the long fall to link your aerial tricks.'},
  {map:7,title:'6 · Dune Dash',goal:2300,reward:140,story:'SPECIAL · Nine bars across desert ruins. Finish through the fire ring.'},
  {map:8,title:'7 · Too Hot to Stay',goal:2500,reward:160,story:'SPECIAL · Catch both bars inside the sauna, fly through its open window and cool off in the lake.'},
  {map:3,title:'8 · Rooftop Royalty',goal:2800,reward:180,story:'SPECIAL · Chain the skyline bars and time the moving fire ring.'},
  {map:5,title:'9 · The Big Drop',goal:3200,reward:200,story:'A towering mountain face. Normal gravity, extraordinary airtime.'},
  {map:9,title:'10 · Moon Motel',goal:3500,reward:240,story:'SPECIAL · LOW GRAVITY 0.48×. Float between lunar bars and through the orbiting fire ring.'},
  {map:10,title:'11 · Ironworks',goal:3900,reward:280,story:'HEAVY GRAVITY 1.30×. Faster falls, tighter timing. Master the factory finale.'}
];
const JUMPBAR_TRICKS=[
  {id:'grab',name:'Grab',owners:[],points:'150',keys:'GRAB / ↑',how:'Hold UP or GRAB for 0.35 s in the air. Bend both knees behind you, hold your ankles and arch your chest forward. Release before landing. Scores once per jump.',unlock:'Available to every character from the start.',demo:'grab',tutorial:true},
  {id:'backflip',name:'Backflip',owners:[],points:'250 per turn',keys:'TUCK / ↓',how:'Launch while rotating backwards. Hold TUCK to spin faster; release it to prepare your landing.',unlock:'Available from the start.',demo:'flip'},
  {id:'frontflip',name:'Frontflip',owners:[],points:'250 per turn',keys:'TUCK / ↓',how:'Release on the opposite swing to rotate forwards. Tuck for speed, then open before landing.',unlock:'Available from the start.',demo:'frontflip'},
  {id:'twist',name:'360° twist',owners:[],points:'200 per turn',keys:'↶ / ↷ · A / D',how:'Hold a twist arrow in the air for a full turn. Release to brake. Combine it with a flip for +150.',unlock:'Available from the start.',demo:'twist'},
  {id:'layout',name:'Layout flip',owners:[],points:'+150 bonus',keys:'Release TUCK',how:'Complete a full flip with a straight body. You need more swing speed than a tucked flip.',unlock:'Available from the start.',demo:'layout'},
  {id:'combo',name:'Trick chain',owners:[],points:'Up to ×6',keys:'TRICK → GRIP',how:'Do a trick and catch a new bar. Keep doing trick jumps to raise the multiplier. A plain jump, old bar or ground landing breaks it.',unlock:'Available from the start.',demo:'flip'},
  {id:'bounce',name:'Recovery bounce',owners:[],points:'Save your run',keys:'Tap TUCK · release',how:'Land on your feet, hold TUCK briefly (under 0.6 s), then release. Hold GRIP to catch the next bar.',unlock:'Available from the start.',demo:'bounce'},
  {id:'candle',name:'Candle',owners:['rookie'],points:'100',keys:'TRICK / E',how:'As Boxer Barry, hold TRICK for 0.4 s in the air without tucking. Keep your body straight.',unlock:'Start with Boxer Barry.',demo:'candle',tutorial:true},
  {id:'cannon',name:'Cannonball',owners:['bruno'],points:'150 · +200 bomb entry',keys:'BOMB / B',how:'As Big Bruno, hold BOMB in the air. It tucks you automatically. Hold for 0.4 s, then stay curled until you hit the water for a huge splash and +200 entry bonus.',unlock:'Buy Big Bruno for 80 coins.',demo:'cannon',tutorial:true},
  {id:'salute',name:'Salute',owners:['guard'],points:'150',keys:'TRICK / E',how:'As Whistle Willie, hold TRICK for 0.4 s without tucking. One hand salutes while the other balances.',unlock:'Buy Whistle Willie for 160 coins.',demo:'salute',tutorial:true},
  {id:'star',name:'Sauna star',owners:['sauna'],points:'175',keys:'TRICK / E',how:'As Sauna Sausage, hold TRICK for 0.4 s without tucking to spread your arms and legs.',unlock:'Buy Sauna Sausage for 240 coins.',demo:'star',tutorial:true},
  {id:'pike',name:'Flipper fold',owners:['diver'],points:'200',keys:'TRICK / E',how:'As Flipper Phil, hold TRICK for 0.4 s without tucking. Fold at the hips with straight legs.',unlock:'Buy Flipper Phil for 320 coins.',demo:'pike',tutorial:true},
  {id:'serve',name:'Flying platter',owners:['arjun'],points:'175',keys:'TRICK / E',how:'As Chef Arjun, hold TRICK for 0.4 s in the air without tucking. Bring both hands forward and serve a flying platter. Scores once per jump.',unlock:'Unlock Chef Arjun with a reward code.',demo:'serve',tutorial:true},
  {id:'deathdive',name:'Death dive',owners:[],points:'250 · +200 timed fold',keys:'DIVE / F → TUCK',how:'Above water, hold DIVE for 0.35 s to spread out face-down. Just before impact, release DIVE and hold TUCK. Fold within the last 0.8 s for +200.',unlock:'Complete chapter 3 with 1,100 points.',demo:'deathdive',tutorial:true,chapter:1}
];
const JUMPBAR_CODES=Object.freeze({start26:{character:'arjun'},jump67:{allLevels:true}});
class JumpbarCampaign {
  constructor(saved=null){
    const chars=typeof JUMPBAR_CHARACTERS!=='undefined'?JUMPBAR_CHARACTERS:require('./physics').JUMPBAR_CHARACTERS;
    this.characters=chars;this.data={version:1,worldVersion:2,unlockedFloor:0,allLevelsUnlocked:false,legacyDeathDive:false,coins:0,redeemedCodes:[],owned:['rookie'],equipped:'rookie',records:{},tutorialsSeen:[]};
    if(saved&&saved.version===1){
      const integer=n=>Number.isSafeInteger(n)&&n>=0?n:0;
      this.data.redeemedCodes=Array.isArray(saved.redeemedCodes)?[...new Set(saved.redeemedCodes.filter(c=>typeof c==='string').map(c=>c.trim().toLowerCase()).filter(c=>Object.hasOwn(JUMPBAR_CODES,c)))]:[];
      this.data.allLevelsUnlocked=saved.allLevelsUnlocked===true;
      this.data.coins=integer(saved.coins);this.data.legacyDeathDive=saved.worldVersion===2?saved.legacyDeathDive===true:(saved.records?.[1]?.successBest||0)>=900;
      // Retired characters are removed from the next save, making refunds
      // idempotent when that save is loaded again.
      for(const [id,price] of [['shadow',420],['astro',700],['neon',220]])if(Array.isArray(saved.owned)&&saved.owned.includes(id))this.data.coins+=price;
      this.data.owned=['rookie',...chars.filter(c=>c.id!=='rookie'&&Array.isArray(saved.owned)&&saved.owned.includes(c.id)).map(c=>c.id)];
      this.data.equipped=this.data.owned.includes(saved.equipped)?saved.equipped:'rookie';
      for(const chapter of JUMPBAR_CHAPTERS){const r=saved.records?.[chapter.map];if(r&&typeof r==='object')this.data.records[chapter.map]={best:integer(r.best),successBest:integer(r.successBest)};}
      if(saved.worldVersion===2)this.data.unlockedFloor=Math.min(JUMPBAR_CHAPTERS.length-1,integer(saved.unlockedFloor));
      else {const old=[{map:0,goal:700},{map:1,goal:900},{map:4,goal:1400},{map:2,goal:1900},{map:3,goal:2400},{map:5,goal:3000}];let n=0;while(n<old.length-1&&(saved.records?.[old[n].map]?.successBest||0)>=old[n].goal)n++;this.data.unlockedFloor=JUMPBAR_CHAPTERS.findIndex(c=>c.map===old[n].map);}
      this.data.tutorialsSeen=JUMPBAR_TRICKS.filter(t=>t.tutorial&&Array.isArray(saved.tutorialsSeen)&&saved.tutorialsSeen.includes(t.id)&&!(t.id==='pike'&&saved.owned?.includes('neon')&&!saved.owned?.includes('diver'))).map(t=>t.id);
    }
  }
  get sandboxUnlocked(){return this.data.allLevelsUnlocked||JUMPBAR_CHAPTERS.every(c=>this.cleared(c.map));}
  chapter(map){return JUMPBAR_CHAPTERS.find(c=>c.map===map);}
  get unlocked(){if(this.data.allLevelsUnlocked)return JUMPBAR_CHAPTERS.length-1;let n=this.data.unlockedFloor;while(n<JUMPBAR_CHAPTERS.length-1&&this.cleared(JUMPBAR_CHAPTERS[n].map))n++;return n;}
  available(map){const index=JUMPBAR_CHAPTERS.findIndex(c=>c.map===map);return index>=0&&index<=this.unlocked;}
  cleared(map){return(this.data.records[map]?.successBest||0)>=(this.chapter(map)?.goal||Infinity);}
  stars(map){const score=this.data.records[map]?.successBest||0,goal=this.chapter(map)?.goal||Infinity;return score>=goal*2?3:score>=goal*1.5?2:score>=goal?1:0;}
  owns(id){return this.data.owned.includes(id);}
  trickUnlocked(id){if(id==='deathdive'&&this.data.legacyDeathDive)return true;const t=JUMPBAR_TRICKS.find(t=>t.id===id);return !!t&&(!t.owners.length||t.owners.some(id=>this.owns(id)))&&(t.chapter===undefined||this.cleared(t.chapter));}
  pendingTutorials(){return JUMPBAR_TRICKS.filter(t=>t.tutorial&&this.trickUnlocked(t.id)&&!this.data.tutorialsSeen.includes(t.id));}
  acknowledgeTutorial(id){if(!this.trickUnlocked(id))return false;if(!this.data.tutorialsSeen.includes(id))this.data.tutorialsSeen.push(id);return true;}
  equip(id){if(!this.owns(id))return false;this.data.equipped=id;return true;}
  redeemCode(input){
    const code=typeof input==='string'?input.trim().toLowerCase():'';
    if(code==='reset')return {ok:false,status:'confirm-reset'};
    if(!Object.hasOwn(JUMPBAR_CODES,code))return {ok:false,status:'invalid'};
    if(JUMPBAR_CODES[code].allLevels){
      if(this.data.redeemedCodes.includes(code))return {ok:false,status:'already'};
      this.data.redeemedCodes.push(code);this.data.allLevelsUnlocked=true;return {ok:true,status:'levels'};
    }
    const {character}=JUMPBAR_CODES[code];
    if(this.data.redeemedCodes.includes(code)||this.owns(character)){if(!this.data.redeemedCodes.includes(code))this.data.redeemedCodes.push(code);return {ok:false,status:'already',character};}
    this.data.redeemedCodes.push(code);this.data.owned.push(character);this.data.equipped=character;return {ok:true,status:'unlocked',character};
  }
  resetProgress(){this.data=new JumpbarCampaign().data;}
  buy(id){
    const character=this.characters.find(c=>c.id===id);
    if(!character||character.rewardOnly||this.owns(id)||this.data.coins<character.price)return false;
    this.data.coins-=character.price;this.data.owned.push(id);this.data.equipped=id;return true;
  }
  claim(game){
    if(game.sandbox||!game.ended||game.rewardClaimed||!this.available(game.mapIndex))return null;
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
if(typeof module!=='undefined')module.exports={JumpbarCampaign,JUMPBAR_CHAPTERS,JUMPBAR_TRICKS};
