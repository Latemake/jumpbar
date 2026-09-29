import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
import {database} from './local-db.mjs';
const realNow=Date.now;
test('global records are shared, runs are single-use, and UTC streaks cannot be farmed',async()=>{
 const db=database(),env={DB:db};let now=Date.UTC(2026,8,28,12);Date.now=()=>now;
 const call=async(path,data,token)=>{const r=await worker.fetch(new Request('https://jumpbar.test/api/'+path,{method:data?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:data?JSON.stringify(data):undefined}),env);return{status:r.status,data:await r.json()};};
 try{
 const a=(await call('players',{name:'Alice'})).data,b=(await call('players',{name:'Bob'})).data;
 assert.equal((await call('players',{name:'<script>'})).status,400);assert.equal((await call('players',{name:'alice'})).status,409);
 async function finish(p,score=1500){const start=await call('start',{map:0},p.token);assert.equal(start.status,200);now+=10000;const body={run:start.data.run,score,jump:650,combo:3,success:true};const r=await call('finish',body,p.token);assert.equal(r.status,200);assert.equal((await call('finish',body,p.token)).status,409);return r.data;}
 assert.equal((await finish(a)).streak,1);assert.equal((await finish(a,1700)).streak,1);await finish(b,1800);
 const board=(await call('boards?category=score')).data.rows;assert.equal(board.length,2);assert.equal(board[0].name,'Bob');assert.equal(board[1].value,1700);assert.equal(JSON.stringify(board).includes('token'),false);
 now+=86400000;assert.equal((await finish(a)).streak,2);now+=2*86400000;const reset=await finish(a);assert.equal(reset.streak,1);assert.equal(reset.best_streak,2);
 assert.equal((await call('boards?category=streak')).data.rows[0].value,2);assert.equal((await call('boards?category=active')).data.rows.length,1);
 const start=await call('start',{map:0},a.token);now+=10000;assert.equal((await call('finish',{run:start.data.run,score:Infinity,jump:1,combo:3,success:true},a.token)).status,400);
 assert.equal((await call('finish',{run:start.data.run,score:1000,jump:500,combo:3,success:true},b.token)).status,409);
 assert.equal((await call('start',{map:0},'wrong-token')).status,401);
 const cross=await worker.fetch(new Request('https://jumpbar.test/api/players',{method:'POST',headers:{Origin:'https://evil.test'},body:'{}'}),env);assert.equal(cross.status,403);
 }finally{Date.now=realNow;db.close();}
});
