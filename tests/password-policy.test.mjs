import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {passwordAccess,signPasswordPermit} from '../lib/auth/password-policy.js';
const adult={user:{authProvider:'supabase'},memberships:[{adult:1}],root:false};
test('Adult members, both family admins and independent superadmin can change their own password',()=>{
 for(const role of ['member','admin'])assert.equal(passwordAccess({...adult,memberships:[{adult:1,role}]}).canChangePassword,true);
 assert.equal(passwordAccess({...adult,root:true,memberships:[]}).canChangePassword,true);
});
test('Minor membership wins across families and cannot be bypassed with role or metadata',()=>{
 for(const root of [false,true])assert.deepEqual(passwordAccess({...adult,root,memberships:[{adult:1,role:'admin'},{adult:0,role:'member'}]}),{minor:true,canChangePassword:false});
 assert.equal(passwordAccess({...adult,memberships:[{adult:0}],user:{...adult.user,user_metadata:{adult:true,role:'admin'}}}).canChangePassword,false);
});
test('Unassociated, missing age and legacy preview identities fail closed',()=>{
 for(const c of [null,{}, {...adult,memberships:[]},{...adult,memberships:[{}]},{...adult,user:{authProvider:'sites'}}])assert.equal(passwordAccess(c).canChangePassword,false);
});
test('HMAC binds account, expiry and nonce; missing server key fails closed',async()=>{
 const secret='ab'.repeat(32),uid='00000000-0000-0000-0000-000000000001',expiry=1800000000,nonce='00000000-0000-0000-0000-000000000002';
 const expected=createHmac('sha256',secret).update(uid+':'+expiry+':'+nonce).digest('hex');
 assert.equal(await signPasswordPermit(secret,uid,expiry,nonce),expected);
 assert.notEqual(await signPasswordPermit(secret,uid,expiry+1,nonce),expected);
 await assert.rejects(signPasswordPermit('',uid,expiry,nonce));
});
