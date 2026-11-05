import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './helpers/database.mjs';
import {provisionCustomer} from '../lib/auth/provision-customer.js';
import {context,state} from '../lib/service.js';
import {createHandler} from '../supabase/functions/laco-create-customer/handler.js';
const requestId='a6073280-17c0-4774-aac8-9627d34dbf9c',userId='9568b123-1830-480f-84e1-0b32ce2ade40';
const root={root:true,user:{userId:'supabase:root'}};
const body=()=>({type:'create_family',requestId,name:'Família de teste',admin:'Adulto',email:'test@example.com',seats:6,expires:'2028-12-31',password:'test-password-12345',passwordConfirm:'test-password-12345'});
test('provisioning creates Auth login and binds the primary adult without storing password',async()=>{
 const db=database();let calls=0;
 const result=await provisionCustomer(db,root,body(),'Bearer test',async(url,init)=>{calls++;const b=JSON.parse(init.body);assert.equal(b.email,'test@example.com');assert.equal(b.requestId,requestId);assert.equal(init.headers.Authorization,'Bearer test');return Response.json({userId});});
 assert.equal(result.ok,true);assert.equal(calls,1);
 assert.equal(db.raw.prepare('SELECT user_id FROM members').get().user_id,'supabase:'+userId);
 assert.equal(db.raw.prepare('SELECT status FROM families').get().status,'active');
 assert.ok(!JSON.stringify(db.raw.prepare('SELECT * FROM audit').all()).includes(body().password));
 await provisionCustomer(db,root,body(),'Bearer test',()=>{throw Error('must not call Auth twice')});
 assert.equal(db.raw.prepare('SELECT count(*) n FROM families').get().n,1);
});
test('password/role validation precedes all writes',async()=>{
 for(const [c,b] of [[{root:false},body()],[root,{...body(),passwordConfirm:'mismatch'}],[root,{...body(),password:'short',passwordConfirm:'short'}]]){
  const db=database();await assert.rejects(()=>provisionCustomer(db,c,b,'',()=>{throw Error('unexpected fetch')}));assert.equal(db.raw.prepare('SELECT count(*) n FROM families').get().n,0);
 }
});
test('Auth failure leaves one recoverable pending family; verified email cannot claim pending access',async()=>{
 const db=database();const send=async()=>Response.json({error:'Try again'},{status:503});
 await assert.rejects(()=>provisionCustomer(db,root,body(),'Bearer test',send),e=>e.pendingFamily===requestId);
 const c=await context(db,{userId:'supabase:existing',email:'test@example.com',authProvider:'supabase'});
 assert.equal(c.memberships.length,0);
 const pending=(await state(db,{...root,memberships:[]},'')).families[0];assert.equal(pending.admin_linked,0);
 await provisionCustomer(db,root,{type:'customer_access',family:requestId,...Object.fromEntries(Object.entries(body()).filter(([k])=>['password','passwordConfirm'].includes(k)))} ,'Bearer test',async()=>Response.json({userId}));
 assert.equal(db.raw.prepare('SELECT count(*) n FROM families').get().n,1);
 assert.equal(db.raw.prepare('SELECT status FROM families').get().status,'active');
 await assert.rejects(()=>provisionCustomer(db,root,{...body(),type:'customer_access',family:requestId},'Bearer test'),/já tem acesso/);
});
function setup({confirmed=true,root=true,existing=null,createError=null,lookupError=null}={}){
 const calls=[];const handler=createHandler({caller:()=>({auth:{getUser:async()=>({data:{user:{email_confirmed_at:confirmed?'now':null}}})},rpc:async()=>({data:{superadmin:root}})}),admin:{rpc:async()=>({data:existing,error:lookupError}),auth:{admin:{createUser:async b=>{calls.push(b);return {data:{user:{id:userId}},error:createError}}}}}});
 const call=async(b=body(),authorization='Bearer test')=>{const r=await handler(new Request('https://example.com',{method:'POST',headers:authorization?{Authorization:authorization}:{},body:JSON.stringify(b)}));return {status:r.status,data:await r.json()};};return {calls,call};
}
test('Edge independently rejects anonymous, unconfirmed and ordinary users',async()=>{
 for(const [options,authorization,status] of [[{},'',401],[{confirmed:false},'Bearer test',401],[{root:false},'Bearer test',403]]){const s=setup(options);assert.equal((await s.call(body(),authorization)).status,status);assert.equal(s.calls.length,0);}
});
test('Edge creates a confirmed account with an idempotency marker and never resets existing passwords',async()=>{
 const s=setup();assert.equal((await s.call()).status,200);assert.equal(s.calls[0].email_confirm,true);assert.equal(s.calls[0].app_metadata.laco_provision_request,requestId);
 for(const same_request of [true,false]){const s=setup({existing:{id:userId,confirmed:true,same_request}});assert.equal((await s.call()).status,same_request?200:409);assert.equal((await s.call({...body(),existing:true,password:undefined})).status,200);assert.equal(s.calls.length,0);}
});
test('unconfirmed existing accounts and lookup failures fail closed',async()=>{
 assert.equal((await setup({existing:{id:userId,confirmed:false}}).call({...body(),existing:true})).status,409);
 const s=setup({lookupError:{message:'unavailable'}});assert.equal((await s.call()).status,502);assert.equal(s.calls.length,0);
});
