import test from 'node:test';
import assert from 'node:assert/strict';
import {withPlatformRole} from '../lib/auth/platform-role.js';
const u={userId:'supabase:verified',email:'user@example.com',canBootstrap:true,role:'superadmin'};
test('Database role authorizes the initial or any future superadmin',async()=>{
 const a=await withPlatformRole(u,{rpc:async name=>{assert.equal(name,'laco_platform_access');return{data:{superadmin:true}}}});
 assert.equal(a.platformAdmin,true);assert.equal(a.canBootstrap,false);
});
test('Revocation and missing roles cannot retain legacy privileges',async()=>{
 for(const data of [{superadmin:false},{superadmin:'true'},null,{}]){
  const a=await withPlatformRole({...u,platformAdmin:true},{rpc:async()=>({data})});assert.equal(a.platformAdmin,false);assert.equal(a.canBootstrap,false);
 }
});
test('Permission service failure fails closed instead of falling back',async()=>{
 await assert.rejects(withPlatformRole(u,{rpc:async()=>({error:{message:'denied'}})}));
 assert.equal(await withPlatformRole(null,{rpc:async()=>{throw Error('must not call')}}),null);
});
