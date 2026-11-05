import test from 'node:test';
import assert from 'node:assert/strict';
import {currentLocation,createTracking,mayTrack} from '../mobile/tracking.js';
import {createAPI} from '../mobile/transport.js';
const now=1800000000000;
const state=()=>({self:'minor',family:{id:'family',status:'active',expires:'2099-12-31'},members:[{id:'minor',adult:0,consent:1,battery_consent:1}]});
const location=()=>({latitude:38.8,longitude:-9.1,accuracy:8,time:now,speed:2,simulated:false});
function harness(){let callback,permission=state();const sent=[],removed=[];const plugin={async addWatcher(options,cb){assert.ok(options.backgroundMessage);assert.equal(options.stale,false);callback=cb;return 'watcher'},async removeWatcher({id}){removed.push(id)}};
 const tracker=createTracking({plugin,loadState:async()=>permission,send:async x=>sent.push(x),readBattery:async()=>({battery:65,charging:false,source:'native'}),clock:()=>now});return {tracker,sent,removed,callback:()=>callback,setState:s=>{permission=s}};}
test('Location normalization rejects stale, future, simulated and invalid readings and converts speed',()=>{
 assert.equal(currentLocation(location(),now).speed,7.2);
 for(const value of [{time:now-120001},{time:now+60001},{simulated:true},{latitude:200},{accuracy:-1},{time:undefined}])assert.equal(currentLocation({...location(),...value},now),null);
 assert.equal(currentLocation({...location(),speed:-1},now).speed,null);
});
test('Tracking needs the authenticated own member, current consent and active inclusive license',()=>{
 assert.equal(mayTrack(state(),now),true);
 for(const s of [{...state(),self:'other'},{...state(),members:[{id:'minor',consent:0}]},{...state(),family:{...state().family,status:'suspended'}},{...state(),family:{...state().family,expires:'2000-01-01'}}])assert.equal(mayTrack(s,now),false);
});
test('Native watcher sends only current own telemetry; revocation removes the watcher before another upload',async()=>{
 const h=harness();await h.tracker.start();await h.callback()(location());assert.equal(h.sent.length,2);assert.equal(h.sent[0].family,'family');assert.equal(h.sent[0].member,undefined);assert.equal(h.sent[1].battery,65);
 h.setState({...state(),members:[{id:'minor',consent:0}]});await h.callback()(location());assert.equal(h.sent.length,2);assert.deepEqual(h.removed,['watcher']);
});
test('A read arriving after logout/stop cannot be uploaded; starting twice creates only one watcher',async()=>{
 const h=harness();await Promise.all([h.tracker.start(),h.tracker.start()]);await h.tracker.stop();await h.callback()(location());assert.equal(h.sent.length,0);assert.deepEqual(h.removed,['watcher']);
});
test('Stopping while native registration is pending cleans up its eventual watcher',async()=>{
 let resolve;const removed=[];const tracker=createTracking({plugin:{addWatcher:()=>new Promise(r=>resolve=r),removeWatcher:async({id})=>removed.push(id)},loadState:async()=>state(),send:async()=>assert.fail('must not upload'),readBattery:async()=>null,clock:()=>now});
 const started=tracker.start();await Promise.resolve();await tracker.stop();resolve('late-watcher');await started;assert.deepEqual(removed,['late-watcher']);
});
test('Missing authorization, native registration errors and no network never create a tracking success',async()=>{
 const h=harness();h.setState({...state(),members:[]});await h.tracker.start();assert.equal(h.tracker.isRunning(),false);
 const broken=createTracking({plugin:{addWatcher:async()=>{throw Error('denied')}},loadState:async()=>state(),send:async()=>{},clock:()=>now});await assert.rejects(broken.start());assert.equal(broken.isRunning(),false);
});
test('Native transport attaches the session only to the fixed Laço API and refuses redirects',async()=>{
 const calls=[];const api=createAPI({http:{request:async options=>{calls.push(options);return {status:200,data:{ok:true}}}},getToken:async()=>'verified'});
 await api('/api/action',{type:'sos',family:'own'});assert.equal(calls[0].headers.Authorization,'Bearer verified');assert.equal(calls[0].disableRedirects,true);
 for(const p of ['https://other.example/api/state','//other.example','/api/action#other','/api/not-allowed'])await assert.rejects(api(p));assert.equal(calls.length,1);
 await assert.rejects(createAPI({http:{request:()=>assert.fail('must not send')},getToken:async()=>null})('/api/state'),{status:401});
});
