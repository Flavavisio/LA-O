import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function database(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');
 for(const file of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
 return {raw:sql,prepare(q){const statement=sql.prepare(q);let args=[];const api={bind(...a){args=a;return api},async first(){return statement.get(...args)||null},async all(){return {results:statement.all(...args)}},async run(){const r=statement.run(...args);return {meta:{changes:Number(r.changes)}}}};return api;},async batch(statements){sql.exec('BEGIN');try{const r=[];for(const statement of statements)r.push(await statement.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};
}
