import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
export function database(file=':memory:'){
 const sqlite=new DatabaseSync(file);sqlite.exec(fs.readFileSync(new URL('./schema.sql',import.meta.url),'utf8'));
 const wrap=(sql,params=[])=>({bind(...values){return wrap(sql,values);},async first(){return sqlite.prepare(sql).get(...params)||null;},async all(){return{results:sqlite.prepare(sql).all(...params)};},async run(){return sqlite.prepare(sql).run(...params);}});
 return {prepare:sql=>wrap(sql),async batch(statements){sqlite.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec('COMMIT');return out;}catch(e){sqlite.exec('ROLLBACK');throw e;}},close(){sqlite.close();}};
}
