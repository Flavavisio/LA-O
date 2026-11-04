import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {action,context,state} from '../lib/service.js';
function database(){const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const p of readdirSync('drizzle').filter(p=>p.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+p,'utf8'));return {
 raw:sql,prepare(q){const stmt=sql.prepare(q);let args=[];const api={bind(...a){args=a;return api},async first(){return stmt.get(...args)||null},async all(){return {results:stmt.all(...args)}},async run(){const r=stmt.run(...args);return {meta:{changes:Number(r.changes)}}}};return api},async batch(stmts){sql.exec('BEGIN');try{const results=[];for(const s of stmts)results.push(await s.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}}}
const user=(id,email)=>({userId:id,email,displayName:id});
const root=user('root','root@example.com'),a=user('a','a@example.com'),b=user('b','b@example.com'),adult=user('adult','adult@example.com');
async function setup(){const db=database();await action(db,await context(db,root),{type:'setup'});const c=await context(db,root);const fa=await action(db,c,{type:'create_family',name:'A',admin:'Admin A',email:a.email,seats:4,expires:'2099-12-31'});const fb=await action(db,c,{type:'create_family',name:'B',admin:'Admin B',email:b.email,seats:3,expires:'2099-12-31'});return{db,fa:fa.id,fb:fb.id,rc:c,ac:await context(db,a),bc:await context(db,b)}}
test('Authentication and superadmin boundaries',async()=>{const {db,ac,rc}=await setup();await assert.rejects(context(db,null),{status:401});await assert.rejects(action(db,ac,{type:'create_family'}),{status:403});await assert.rejects(action(db,rc,{type:'setup'}),{status:409});const s=await state(db,rc);assert.equal(s.families.length,2);assert.equal(s.members,undefined);});
test('Tenant isolation and root location restriction',async()=>{const {db,fa,fb,ac,rc}=await setup();await assert.rejects(state(db,ac,fb),{status:403});await assert.rejects(state(db,rc,fa),{status:403});await assert.rejects(action(db,ac,{type:'add_member',family:fb,name:'X',relation:'Outro',email:'x@example.com'}),{status:403});});
test('License seats include primary admin and enforce lower bound',async()=>{const {db,fa,ac,rc}=await setup();await action(db,rc,{type:'license',family:fa,seats:1,expires:'2099-12-31'});await assert.rejects(action(db,ac,{type:'add_member',family:fa,name:'Novo',email:'n@example.com',relation:'Outro'}),{status:409});await action(db,rc,{type:'license',family:fa,seats:2,expires:'2099-12-31'});await action(db,ac,{type:'add_member',family:fa,name:'Novo',email:'n@example.com',relation:'Outro'});await assert.rejects(action(db,rc,{type:'license',family:fa,seats:1,expires:'2099-12-31'}),{status:409});});
test('At most two admins; primary cannot be removed',async()=>{const {db,fa,ac}=await setup();await action(db,ac,{type:'add_member',family:fa,name:'Segundo',email:'second@example.com',relation:'Pai',role:'admin'});await assert.rejects(action(db,ac,{type:'add_member',family:fa,name:'Terceiro',email:'third@example.com',relation:'Avô',role:'admin'}),{status:409});await assert.rejects(action(db,ac,{type:'remove_member',family:fa,member:ac.memberships[0].id}),{status:403});});
test('Adult consent is self-only; revocation deletes location',async()=>{const {db,fa,ac}=await setup();await action(db,ac,{type:'add_member',family:fa,name:'Adulto',email:adult.email,relation:'Cônjuge'});const mc=await context(db,adult),mid=mc.memberships[0].id;await assert.rejects(action(db,ac,{type:'consent',family:fa,member:mid,value:true}),{status:403});await assert.rejects(action(db,mc,{type:'location',family:fa,lat:38,lng:-9,accuracy:10}),{status:403});await action(db,mc,{type:'consent',family:fa,member:mid,value:true});await action(db,mc,{type:'location',family:fa,lat:38.8,lng:-9.1,accuracy:10,speed:15});assert.equal((await state(db,ac,fa)).members.find(m=>m.id===mid).lat,38.8);await action(db,mc,{type:'consent',family:fa,member:mid,value:false});assert.equal((await state(db,ac,fa)).members.find(m=>m.id===mid).lat,null);const raw=db.raw.prepare('SELECT lat,lng,updated FROM members WHERE id=?').get(mid);assert.equal(raw.lat,null);assert.equal(raw.updated,null);});
test('Only own device can publish location, and ordinary members cannot view others',async()=>{const {db,fa,ac}=await setup();await action(db,ac,{type:'add_member',family:fa,name:'Adulto',email:adult.email,relation:'Pai'});const mc=await context(db,adult);await action(db,ac,{type:'consent',family:fa,member:ac.memberships[0].id,value:true});await action(db,ac,{type:'location',family:fa,lat:38,lng:-9,accuracy:10});const s=await state(db,mc,fa);assert.equal(s.members.find(m=>m.is_primary).lat,null);await assert.rejects(action(db,mc,{type:'location',family:fa,member:ac.memberships[0].id,lat:38,lng:-9,accuracy:10}),{status:403});});
test('Minor authorization requires admin, adults cannot be made admins if minor',async()=>{const {db,fa,ac}=await setup();await assert.rejects(action(db,ac,{type:'add_member',family:fa,name:'Menor',email:'minor@example.com',relation:'Filho',role:'admin',adult:false}),{status:400});await action(db,ac,{type:'add_member',family:fa,name:'Menor',email:'minor@example.com',relation:'Filho',adult:false});const mc=await context(db,user('minor','minor@example.com'));await assert.rejects(action(db,mc,{type:'consent',family:fa,member:mc.memberships[0].id,value:true}),{status:403});await action(db,ac,{type:'consent',family:fa,member:mc.memberships[0].id,value:true});});
test('SOS belongs to actual signed-in member, and only family admin can acknowledge',async()=>{const {db,fa,fb,ac,bc}=await setup();await action(db,ac,{type:'add_member',family:fa,name:'Adulto',email:adult.email,relation:'Pai'});const mc=await context(db,adult);await action(db,mc,{type:'sos',family:fa,member:ac.memberships[0].id});const alert=(await state(db,ac,fa)).alerts[0];assert.equal(alert.member,mc.memberships[0].id);await assert.rejects(action(db,mc,{type:'ack',family:fa,alert:alert.id}),{status:403});await assert.rejects(action(db,bc,{type:'ack',family:fb,alert:alert.id}),{status:409});await action(db,ac,{type:'ack',family:fa,alert:alert.id});assert.equal((await state(db,ac,fa)).alerts[0].status,'resolved');});
test('Suspension hides existing location and blocks writes but permits revocation',async()=>{const {db,fa,ac,rc}=await setup();const mid=ac.memberships[0].id;await action(db,ac,{type:'consent',family:fa,member:mid,value:true});await action(db,ac,{type:'location',family:fa,lat:38,lng:-9,accuracy:20});await action(db,rc,{type:'family_status',family:fa,status:'suspended'});assert.equal((await state(db,ac,fa)).members[0].lat,null);await assert.rejects(action(db,ac,{type:'sos',family:fa}),{status:403});await action(db,ac,{type:'consent',family:fa,member:mid,value:false});});
test('Reject invalid coordinates, duplicate email and oversized capacity',async()=>{const {db,fa,ac,rc}=await setup();await assert.rejects(action(db,rc,{type:'license',family:fa,seats:1000,expires:'2099-12-31'}),{status:400});await assert.rejects(action(db,ac,{type:'add_member',family:fa,name:'Dup',email:a.email,relation:'Outro'}),{status:409});await action(db,ac,{type:'consent',family:fa,member:ac.memberships[0].id,value:true});await assert.rejects(action(db,ac,{type:'location',family:fa,lat:999,lng:-9,accuracy:10}),{status:400});});
test('Battery is own telemetry, isolated between families, and visible only with consent',async()=>{
 const {db,fa,fb,ac,bc,rc}=await setup();
 const mid=ac.memberships[0].id;
 await assert.rejects(action(db,ac,{type:'battery',family:fa,battery:86,charging:false,source:'web'}),{status:403});
 await action(db,ac,{type:'consent',family:fa,member:mid,value:true});
 await action(db,ac,{type:'battery',family:fa,battery:86,charging:false,source:'web'});
 const own=(await state(db,ac,fa)).members.find(m=>m.id===mid);assert.equal(own.battery,86);assert.equal(own.charging,false);assert.ok(own.battery_updated);assert.equal(own.lat,null);
 await assert.rejects(action(db,ac,{type:'battery',family:fb,battery:12,charging:true,source:'native'}),{status:403});
 await assert.rejects(action(db,rc,{type:'battery',family:fa,battery:12,charging:true,source:'native'}),{status:403});
 await action(db,ac,{type:'add_member',family:fa,name:'Adulto',email:adult.email,relation:'Pai'});const mc=await context(db,adult);
 const limited=(await state(db,mc,fa)).members.find(m=>m.id===mid);assert.equal(limited.battery,null);assert.equal(limited.battery_updated,null);
 await action(db,mc,{type:'consent',family:fa,member:mc.memberships[0].id,value:true});
 await assert.rejects(action(db,mc,{type:'battery',family:fa,member:mid,battery:1,charging:false,source:'web'}),{status:403});
});
test('Battery accepts 0% and charging changes; rejects invalid values',async()=>{
 const {db,fa,ac}=await setup();await action(db,ac,{type:'consent',family:fa,member:ac.memberships[0].id,value:true});
 for(const battery of [-1,101,42.5,null,'30'])await assert.rejects(action(db,ac,{type:'battery',family:fa,battery,charging:false,source:'web'}),{status:400});
 await assert.rejects(action(db,ac,{type:'battery',family:fa,battery:30,charging:'yes',source:'web'}),{status:400});
 await action(db,ac,{type:'battery',family:fa,battery:0,charging:true,source:'native'});
 const saved=(await state(db,ac,fa)).members[0];assert.equal(saved.battery,0);assert.equal(saved.charging,true);assert.equal(saved.battery_source,'native');
});
test('Consent revocation clears all telemetry; suspension hides battery and prevents writes',async()=>{
 const {db,fa,ac,rc}=await setup();const mid=ac.memberships[0].id;await action(db,ac,{type:'consent',family:fa,member:mid,value:true});await action(db,ac,{type:'battery',family:fa,battery:22,charging:false,source:'web'});
 await action(db,rc,{type:'family_status',family:fa,status:'suspended'});assert.equal((await state(db,ac,fa)).members[0].battery,null);
 await assert.rejects(action(db,ac,{type:'battery',family:fa,battery:20,charging:false,source:'web'}),{status:403});
 await action(db,ac,{type:'consent',family:fa,member:mid,value:false});const raw=db.raw.prepare('SELECT battery,charging,battery_source,battery_updated FROM members WHERE id=?').get(mid);assert.ok(Object.values(raw).every(v=>v===null));
});
test('Existing location consent is not silently expanded to battery sharing',async()=>{
 const {db,fa,ac}=await setup();const mid=ac.memberships[0].id;
 db.raw.prepare('UPDATE members SET consent=1,battery_consent=0 WHERE id=?').run(mid);
 await assert.rejects(action(db,ac,{type:'battery',family:fa,battery:70,charging:false,source:'web'}),{status:403});
 await action(db,ac,{type:'consent',family:fa,member:mid,value:true});
 await action(db,ac,{type:'battery',family:fa,battery:70,charging:false,source:'web'});
 assert.equal((await state(db,ac,fa)).members[0].battery,70);
});
test('Minor can neither activate nor deactivate sharing; both administrators can manage it',async()=>{
 const {db,fa,ac}=await setup();
 await action(db,ac,{type:'add_member',family:fa,name:'Menor',email:'minor@example.com',relation:'Filho',adult:false});
 await action(db,ac,{type:'add_member',family:fa,name:'Segundo responsável',email:'second@example.com',relation:'Pai',role:'admin'});
 const mc=await context(db,user('minor','minor@example.com')),mid=mc.memberships[0].id;
 const sc=await context(db,user('second','second@example.com'));
 for(const value of [false,true])await assert.rejects(action(db,mc,{type:'consent',family:fa,member:mid,value}),{status:403});
 await action(db,ac,{type:'consent',family:fa,member:mid,value:true});
 assert.equal((await state(db,ac,fa)).members.find(m=>m.id===mid).consent,1);
 await assert.rejects(action(db,mc,{type:'consent',family:fa,member:mid,value:false}),{status:403});
 assert.equal((await state(db,ac,fa)).members.find(m=>m.id===mid).consent,1);
 await action(db,sc,{type:'consent',family:fa,member:mid,value:false});
 assert.equal((await state(db,ac,fa)).members.find(m=>m.id===mid).consent,0);
 await action(db,sc,{type:'consent',family:fa,member:mid,value:true});
 assert.equal((await state(db,ac,fa)).members.find(m=>m.id===mid).consent,1);
});
