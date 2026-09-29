import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import worker from './worker.mjs';
import {database} from './local-db.mjs';
const root=path.resolve('dist'),db=database();
const env={DB:db,ASSETS:{async fetch(req){const url=new URL(req.url),file=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!file.startsWith(root+path.sep)||path.basename(file).startsWith('_'))return new Response('Not found',{status:404});try{const data=await fs.readFile(file),ext=path.extname(file),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wav':'audio/wav','.webp':'image/webp'};return new Response(data,{headers:{'Content-Type':types[ext]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}}}};
http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const response=await worker.fetch(new Request('http://127.0.0.1:8788'+req.url,{method:req.method,headers:req.headers,...(chunks.length?{body:Buffer.concat(chunks)}:{})}),env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(500).end();}}).listen(8788,'127.0.0.1',()=>console.log('Local game and shared test leaderboard: http://127.0.0.1:8788'));
