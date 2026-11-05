import test from 'node:test';
import assert from 'node:assert/strict';
import {requireApplicationUser} from '../lib/auth/request-user.js';
const request=headers=>new Request('https://laco.example/api/state',{headers});

test('Public visitors and hosting identities cannot bootstrap or read family data',async()=>{
 let called=false;
 for(const headers of [{},{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.com'},{authorization:'Basic other'},{authorization:'Bearer'},{authorization:'Bearer one two'}]){
  await assert.rejects(requireApplicationUser(request(headers),async()=>{called=true;return {platformAdmin:true}}),{status:401});
 }
 assert.equal(called,false);
});
test('A valid Laço token uses only the verified identity and current role',async()=>{
 const user={userId:'supabase:adult',platformAdmin:false};
 const result=await requireApplicationUser(request({authorization:'Bearer valid','oai-authenticated-user-id':'some-other-owner'}),async token=>{assert.equal(token,'valid');return user});
 assert.equal(result,user);
});
test('Invalid tokens and role service failures never fall back to hosting identity',async()=>{
 const r=request({authorization:'Bearer invalid','oai-authenticated-user-id':'owner'});
 await assert.rejects(requireApplicationUser(r,async()=>null),{status:401});
 await assert.rejects(requireApplicationUser(r,async()=>{throw Error('role unavailable')}),{status:503});
});
