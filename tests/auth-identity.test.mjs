import test from 'node:test';
import assert from 'node:assert/strict';
import {verifiedSupabaseUser} from '../lib/auth/identity.js';
const record={id:'uuid-owner',email:'owner@example.com',email_confirmed_at:'2026-11-04T12:00:00Z',user_metadata:{full_name:'Owner',role:'superadmin'}};
const client=(user=record,error=null)=>({auth:{getUser:async()=>({data:{user},error})}});
test('Authentication verifies the token through Supabase and never trusts metadata roles',async()=>{
 const u=await verifiedSupabaseUser('valid-token',client());assert.equal(u.userId,'supabase:uuid-owner');assert.equal(u.canBootstrap,false);assert.equal(u.role,undefined);
 const allowed=await verifiedSupabaseUser('valid-token',client(),{bootstrapEmail:'Owner@example.com'});assert.equal(allowed.canBootstrap,true);
});
test('Invalid, expired, deleted, unconfirmed and anonymous identities fail closed',async()=>{
 assert.equal(await verifiedSupabaseUser('',client()),null);
 assert.equal(await verifiedSupabaseUser('expired',client(record,{message:'invalid JWT'})),null);
 assert.equal(await verifiedSupabaseUser('deleted',client(null)),null);
 assert.equal(await verifiedSupabaseUser('unconfirmed',client({...record,email_confirmed_at:null})),null);
 assert.equal(await verifiedSupabaseUser('anonymous',client({...record,email:null})),null);
 assert.equal(await verifiedSupabaseUser('offline',{auth:{getUser:async()=>{throw Error('network')}}}),null);
});
test('Private preview identity may authorize its matching owner, but not another account',async()=>{
 assert.equal((await verifiedSupabaseUser('token',client(),{trustedPreviewEmail:'owner@example.com'})).canBootstrap,true);
 assert.equal((await verifiedSupabaseUser('token',client(),{trustedPreviewEmail:'someone@example.com'})).canBootstrap,false);
});
