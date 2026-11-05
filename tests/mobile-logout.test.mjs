import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionStorage,SESSION_KEY} from '../mobile/session-storage.js';
import {finishLogout,withDeadline,createRequestFence} from '../mobile/logout.js';
function secureStore(){const values=new Map();return {values,get:async k=>values.get(k)??null,set:async(k,v)=>{values.set(k,v)},remove:async k=>values.delete(k),keys:async()=>[...values.keys()]};}
test('logout clears auth keys but keeps installation and persists denial over app restarts',async()=>{
 const secure=secureStore();secure.values.set('installation','device');secure.values.set(SESSION_KEY,'token');secure.values.set(SESSION_KEY+'-user','private');secure.values.set(SESSION_KEY+'-flows-code-verifier','secret');
 const store=await createSessionStorage(secure),old=store.adapter();assert.equal(await old.getItem(SESSION_KEY),'token');await store.lock();
 assert.equal(await old.getItem(SESSION_KEY),null);assert.equal(secure.values.get('installation'),'device');assert.ok(!secure.values.has(SESSION_KEY));
 // A delayed refresh cannot restore an ended session, even after a new login.
 await old.setItem(SESSION_KEY,'stale');const restarted=await createSessionStorage(secure);assert.equal(restarted.isBlocked(),true);assert.equal(await restarted.adapter().getItem(SESSION_KEY),null);
 await store.unlock();const current=store.adapter();await current.setItem(SESSION_KEY,'new-token');await old.setItem(SESSION_KEY,'stale');await old.removeItem(SESSION_KEY);assert.equal(await current.getItem(SESSION_KEY),'new-token');
});
test('a secure read in flight is fenced when logout starts',async()=>{
 const secure=secureStore();const store=await createSessionStorage(secure);let resolve;secure.get=()=>new Promise(r=>{resolve=r});const read=store.adapter().getItem(SESSION_KEY);const locked=store.lock();resolve('old-token');assert.equal(await read,null);await locked;
});
test('local cleanup completes despite offline revocation and failed GPS/push plugins',async()=>{
 const secure=secureStore();secure.values.set(SESSION_KEY,'token');const store=await createSessionStorage(secure);
 const result=await finishLogout({lockSession:()=>store.lock(),stopTracking:async()=>{throw Error('GPS plugin')},removePush:async()=>{throw Error('FCM not configured')},revokeSession:async()=>{throw Error('offline')}});
 assert.equal(result.remoteRevoked,false);assert.equal(result.deviceCleanup,false);assert.equal(await store.adapter().getItem(SESSION_KEY),null);
});
test('unresponsive remote operations have a deadline and never block local sign out',async()=>{
 const hang=()=>new Promise(()=>{});let locked=false;
 const result=await finishLogout({lockSession:async()=>{locked=true},stopTracking:hang,removePush:hang,revokeSession:hang,deadline:task=>withDeadline(task,5)});
 assert.equal(locked,true);assert.equal(result.remoteRevoked,false);
});
test('storage failures are reported instead of claiming a clean logout',async()=>{
 await assert.rejects(()=>finishLogout({lockSession:async()=>{throw Error('secure storage unavailable')},stopTracking:async()=>{},removePush:async()=>{},revokeSession:async()=>{}}),/secure storage/);
});
test('a state response from the old account cannot repopulate the UI after logout or account switching',()=>{
 const fence=createRequestFence(),old=fence.capture();fence.close();assert.equal(fence.current(old),false);fence.open();assert.equal(fence.current(old),false);assert.equal(fence.current(fence.capture()),true);
});
