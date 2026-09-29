import fs from 'node:fs';
fs.mkdirSync('dist',{recursive:true});
for(const name of ['index.html','style.css','physics.js','campaign.js','renderer.js','audio.js','game.js','guide.js','leaderboards.js','migration.js','assets','vendor'])fs.cpSync(name,'dist/'+name,{recursive:true});
fs.copyFileSync('server/worker.mjs','dist/_worker.js');
fs.writeFileSync('dist/_routes.json',JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
console.log('Built dist with static game, API worker and audio assets.');
