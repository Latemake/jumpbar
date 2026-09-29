const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const DAY=86400000;
const day=ms=>new Date(ms).toISOString().slice(0,10);
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
export const categories=['jump','score','combo','streak','active',...Array.from({length:11},(_,i)=>'map'+i)];
export function validResult(b,run,now){return Number.isSafeInteger(b.score)&&b.score>=0&&b.score<=250000&&Number.isSafeInteger(b.jump)&&b.jump>=0&&b.jump<=b.score&&Number.isSafeInteger(b.combo)&&b.combo>=0&&b.combo<=6&&typeof b.success==='boolean'&&now-run.started>=2000&&now-run.started<=20*60000&&b.score<=(now-run.started)/1000*2000;}
async function body(req){if(Number(req.headers.get('Content-Length'))>2048)throw Error('Request too large');const text=await req.text();if(text.length>2048)throw Error('Request too large');return JSON.parse(text);}
async function player(req,db){const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');if(!token||token.length>150)return null;return db.prepare('SELECT * FROM players WHERE token_hash=?').bind(await hash(token)).first();}
async function api(req,env){
 const db=env.DB;if(!db)return json({error:'Leaderboards are not connected yet.'},503);
 const url=new URL(req.url),path=url.pathname,now=Date.now();
 if(req.method==='GET'&&path==='/api/boards'){
  const category=url.searchParams.get('category')||'jump';if(!categories.includes(category))return json({error:'Unknown leaderboard'},400);
  let query;if(category==='streak')query=db.prepare('SELECT id,name,best_streak AS value FROM players WHERE best_streak>0 ORDER BY best_streak DESC,name LIMIT 50');
  else if(category==='active')query=db.prepare('SELECT id,name,streak AS value FROM players WHERE last_day>=? AND streak>0 ORDER BY streak DESC,name LIMIT 50').bind(day(now-DAY));
  else query=db.prepare('SELECT p.id,p.name,r.value FROM records r JOIN players p ON p.id=r.player_id WHERE r.category=? ORDER BY r.value DESC,r.achieved ASC LIMIT 50').bind(category);
  const rows=await query.all();return json({rows:rows.results,day:day(now),category});
 }
 if(req.method==='POST'&&path==='/api/players'){
  const b=await body(req),name=String(b.name||'').trim();if(!/^[\p{L}\p{N}_ -]{3,20}$/u.test(name))return json({error:'Use 3–20 letters, numbers, spaces, _ or -.'},400);
  const key=await hash('register:'+day(now)+':'+(req.headers.get('CF-Connecting-IP')||'local'));
  const limit=await db.prepare('INSERT INTO limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,now+DAY).first();
  if(limit.count>5)return json({error:'Too many new players today. Try tomorrow.'},429);
  if(await db.prepare('SELECT id FROM players WHERE name=?').bind(name).first())return json({error:'That nickname is taken.'},409);
  const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID();
  await db.prepare('INSERT INTO players(id,name,token_hash) VALUES(?,?,?)').bind(id,name,await hash(token)).run();return json({id,name,token},201);
 }
 const p=await player(req,db);if(!p)return json({error:'Choose a nickname to join.'},401);
 if(req.method==='POST'&&path==='/api/start'){
  const b=await body(req);if(!Number.isInteger(b.map)||b.map<0||b.map>10)return json({error:'Invalid course'},400);
  const allowed=await db.prepare('UPDATE players SET last_start=? WHERE id=? AND last_start<=? RETURNING id').bind(now,p.id,now-2000).first();if(!allowed)return json({error:'Wait a moment before starting again.'},429);
  const id=crypto.randomUUID();await db.batch([db.prepare('INSERT INTO runs(id,player_id,started,map) VALUES(?,?,?,?)').bind(id,p.id,now,b.map),db.prepare('DELETE FROM runs WHERE started<?').bind(now-20*60000),db.prepare('DELETE FROM limits WHERE expires<?').bind(now)]);return json({run:id});
 }
 if(req.method==='POST'&&path==='/api/finish'){
  const b=await body(req),run=await db.prepare('SELECT * FROM runs WHERE id=? AND player_id=?').bind(String(b.run||''),p.id).first();
  if(!run||run.used)return json({error:'This run expired or was already submitted.'},409);
  if(!validResult(b,run,now))return json({error:'Invalid run result.'},400);
  // Claim once before recording; retries can never duplicate a run or daily credit.
  const claimed=await db.prepare('UPDATE runs SET used=1 WHERE id=? AND used=0 RETURNING id').bind(run.id).first();if(!claimed)return json({error:'Already submitted.'},409);
  const stats=[['score',b.score],['jump',b.jump],['combo',b.combo]];if(b.success)stats.push(['map'+run.map,b.score]);
  const writes=stats.filter(([,v])=>v>0).map(([key,v])=>db.prepare('INSERT INTO records(player_id,category,value,achieved) VALUES(?,?,?,?) ON CONFLICT(player_id,category) DO UPDATE SET value=excluded.value,achieved=excluded.achieved WHERE excluded.value>records.value').bind(p.id,key,v,now));
  if(b.success){const expression='CASE WHEN last_day=? THEN streak WHEN last_day=? THEN streak+1 ELSE 1 END';writes.push(db.prepare('UPDATE players SET best_streak=MAX(best_streak,'+expression+'),streak='+expression+',last_day=? WHERE id=?').bind(day(now),day(now-DAY),day(now),day(now-DAY),day(now),p.id));}
  if(writes.length)await db.batch(writes);
  const updated=await db.prepare('SELECT streak,best_streak,last_day FROM players WHERE id=?').bind(p.id).first();return json({saved:true,...updated});
 }
 return json({error:'Not found'},404);
}
export default {async fetch(req,env){const url=new URL(req.url);if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(req);
 // Same-origin API: no cross-origin credentials or public write keys.
 const origin=req.headers.get('Origin');if(origin&&origin!==url.origin)return json({error:'Origin not allowed'},403);
 try{return await api(req,env);}catch(e){console.error('Leaderboard request failed');return json({error:'Could not save right now. Please try again.'},500);}
}};
