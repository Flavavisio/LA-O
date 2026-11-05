import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/database.mjs';
import {context,action,state} from '../lib/service.js';
import {dispatchSOS} from '../lib/notifications/dispatch.js';
import {assertWriteOrigin} from '../lib/auth/write-origin.js';
import {requireApplicationUser} from '../lib/auth/request-user.js';
import {runWithRuntimeContext,getRuntimeContext} from '../lib/runtime-context.js';
const user=(id)=>({userId:id,email:id+'@example.com',authProvider:'supabase',platformAdmin:id==='root'});
const installation='00000000-0000-4000-8000-000000000001';
async function setup(){
 const db=database(),rc=await context(db,user('root'));
 const fa=(await action(db,rc,{type:'create_family',name:'A',admin:'Admin A',email:'a@example.com',seats:6,expires:'2099-12-31'})).id;
 const fb=(await action(db,rc,{type:'create_family',name:'B',admin:'Admin B',email:'b@example.com',seats:3,expires:'2099-12-31'})).id;
 const ac=await context(db,user('a')),bc=await context(db,user('b'));
 for(const [name,adult,role] of [['minor',false,'member'],['adult',true,'member'],['second',true,'admin']])await action(db,ac,{type:'add_member',family:fa,name,email:name+'@example.com',adult,role,relation:'Familiar'});
 const mc=await context(db,user('minor')),oc=await context(db,user('adult')),sc=await context(db,user('second'));
 return {db,fa,fb,ac,bc,mc,oc,sc,rc};
}
const register=(db,c,token,extra={})=>action(db,c,{type:'register_device',installation,platform:'android',provider:'fcm',token,...extra});
test('Native writes require a bearer; foreign websites cannot bypass the web origin guard',async()=>{
 const make=headers=>new Request('https://laco.example/api/action',{method:'POST',headers});
 for(const origin of [undefined,'capacitor://localhost','https://localhost','http://localhost']){
  const headers={authorization:'Bearer fake',...(origin?{origin}:{})};assert.doesNotThrow(()=>assertWriteOrigin(make(headers)));
  await assert.rejects(requireApplicationUser(make(headers),async()=>null),{status:401});
 }
 for(const headers of [{},{origin:'capacitor://localhost'},{origin:'https://other.example',authorization:'Bearer valid'}])assert.throws(()=>assertWriteOrigin(make(headers)),{status:403});
});
test('SOS atomically queues only the two actual family administrators, never other families or ordinary members',async()=>{
 const {db,fa,ac,bc,mc,oc,sc}=await setup();
 for(const [c,t] of [[ac,'a'.repeat(30)],[bc,'b'.repeat(30)],[mc,'m'.repeat(30)],[oc,'o'.repeat(30)]])await register(db,c,t);
 await register(db,sc,'c'.repeat(64),{platform:'ios',provider:'apns',environment:'sandbox'});
 const result=await action(db,mc,{type:'sos',family:fa,member:ac.memberships[0].id});
 const jobs=db.raw.prepare('SELECT d.user_id FROM notification_jobs j JOIN notification_devices d ON d.id=j.device_id WHERE j.alert=?').all(result.id);
 assert.deepEqual(jobs.map(j=>j.user_id).sort(),['a','second']);
 const view=await state(db,mc,fa);assert.equal(view.alerts[0].member,mc.memberships[0].id);assert.equal(view.alerts[0].push_devices,2);
 assert.equal(JSON.stringify(view).includes('a'.repeat(30)),false);
 const summary=await dispatchSOS(db,result.id,{});assert.equal(summary.sent,0);assert.equal(summary.pending,2);
 assert.ok(db.raw.prepare('SELECT status,attempts FROM notification_jobs').all().every(j=>j.status==='configuration'&&j.attempts===0));
});
test('Provider acceptance is recorded once; repeat dispatch does not duplicate accepted notifications',async()=>{
 const {db,fa,ac,mc}=await setup();await register(db,ac,'a'.repeat(30));const result=await action(db,mc,{type:'sos',family:fa});let sent=0;
 const send=async()=>{sent++;return {status:'sent',code:null}};
 await dispatchSOS(db,result.id,{}, {send});const second=await dispatchSOS(db,result.id,{}, {send});
 assert.equal(sent,1);assert.equal(second.sent,1);assert.equal(db.raw.prepare('SELECT attempts FROM notification_jobs').get().attempts,1);
});
test('Delivery rechecks membership, license, alert status and token rotation',async()=>{
 const {db,fa,ac,mc,sc,rc}=await setup();await register(db,ac,'a'.repeat(30));await register(db,sc,'c'.repeat(30));const result=await action(db,mc,{type:'sos',family:fa});
 await action(db,ac,{type:'remove_member',family:fa,member:sc.memberships[0].id});await register(db,ac,'new'.repeat(20));let seen=[];
 await dispatchSOS(db,result.id,{}, {send:async d=>{seen.push(d.token);return {status:'failed',code:'test'}}});assert.deepEqual(seen,['new'.repeat(20)]);
 await action(db,rc,{type:'family_status',family:fa,status:'suspended'});seen=[];await dispatchSOS(db,result.id,{}, {send:async d=>{seen.push(d);return {status:'sent'}}});assert.equal(seen.length,0);
 await action(db,rc,{type:'family_status',family:fa,status:'active'});await action(db,ac,{type:'ack',family:fa,alert:result.id});
 await dispatchSOS(db,result.id,{}, {send:async()=>{throw Error('must not send')}});
});
test('Unregister is own-account only, and token possession rebinds one physical device after an account switch',async()=>{
 const {db,fa,ac,bc,mc}=await setup();const token='a'.repeat(30);await register(db,ac,token);const result=await action(db,mc,{type:'sos',family:fa});
 await action(db,bc,{type:'unregister_device',installation});assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM notification_devices').get().n,1);
 await register(db,bc,token);assert.equal(db.raw.prepare('SELECT user_id FROM notification_devices').get().user_id,'b');
 assert.equal(db.raw.prepare('SELECT status FROM notification_jobs WHERE alert=?').get(result.id).status,'cancelled');
});
test('Device caps, provider/token validation, and unknown accounts fail closed',async()=>{
 const {db,ac}=await setup();
 for(let n=0;n<5;n++)await register(db,ac,'token'.repeat(10)+n,{installation:installation.slice(0,-1)+n});
 await assert.rejects(register(db,ac,'token'.repeat(10)+'six',{installation:installation.slice(0,-1)+'9'}),{status:409});
 await assert.rejects(register(db,ac,'bad',{platform:'ios',provider:'fcm'}),{status:400});
 await assert.rejects(register(db,await context(db,user('unknown')),'token'.repeat(10)),{status:403});
});
test('Failed jobs stop after three attempts and old requests expire instead of waking a device late',async()=>{
 const {db,fa,ac,mc}=await setup();await register(db,ac,'a'.repeat(30));const result=await action(db,mc,{type:'sos',family:fa});let attempts=0;const send=async()=>{attempts++;return {status:'failed',code:'provider_unavailable'}};
 for(let i=0;i<5;i++)await dispatchSOS(db,result.id,{}, {send});assert.equal(attempts,3);
 db.raw.prepare("UPDATE notification_jobs SET created='2000-01-01T00:00:00Z'").run();await dispatchSOS(db,result.id,{}, {send});assert.equal(db.raw.prepare('SELECT status FROM notification_jobs').get().status,'expired');
});
test('Native telemetry rejects stale coordinates and target spoofing, and removal cleans dependent SOS jobs',async()=>{
 const {db,fa,ac,mc}=await setup();const mid=mc.memberships[0].id;await action(db,ac,{type:'consent',family:fa,member:mid,value:true});
 const payload={type:'location',family:fa,source:'native',recordedAt:Date.now(),lat:38,lng:-9,accuracy:10,speed:5};
 await assert.rejects(action(db,mc,{...payload,recordedAt:Date.now()-180000}),{status:400});await assert.rejects(action(db,mc,{...payload,member:ac.memberships[0].id}),{status:403});
 await action(db,mc,payload);assert.equal((await state(db,ac,fa)).members.find(m=>m.id===mid).lat,38);
 await register(db,ac,'a'.repeat(30));await action(db,mc,{type:'sos',family:fa});await action(db,ac,{type:'remove_member',family:fa,member:mid});assert.equal(db.raw.prepare('SELECT COUNT(*) n FROM notification_jobs').get().n,0);
});
test('Execution contexts remain separate across concurrent requests',async()=>{
 const one={id:1},two={id:2};const seen=await Promise.all([one,two].map(c=>runWithRuntimeContext(c,async()=>{await Promise.resolve();return getRuntimeContext()})));assert.deepEqual(seen,[one,two]);assert.equal(getRuntimeContext(),undefined);
});
