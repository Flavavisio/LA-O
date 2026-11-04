import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBattery,readBattery,createBatteryReporter,batteryFreshness } from '../lib/device/battery.js';

test('Normalize valid readings including empty battery and charging',()=>{
 assert.deepEqual(normalizeBattery({batteryLevel:0,isCharging:false},'native'),{battery:0,charging:false,source:'native'});
 assert.deepEqual(normalizeBattery({batteryLevel:0.864,isCharging:true},'web'),{battery:86,charging:true,source:'web'});
 for(const batteryLevel of [-1,1.1,NaN,Infinity,'0.5',null])assert.equal(normalizeBattery({batteryLevel,isCharging:true},'web'),null);
 assert.equal(normalizeBattery({batteryLevel:1},'web'),null);
});
test('Unsupported, denied and invalid APIs never fabricate battery',async()=>{
 assert.equal(await readBattery({navigator:{}}),null);
 assert.equal(await readBattery({navigator:{getBattery:async()=>{throw Error('denied')}}}),null);
 assert.equal(await readBattery({nativeDevice:{getBatteryInfo:async()=>({batteryLevel:-1,isCharging:false})}}),null);
});
test('Official native provider and web API follow the same contract',async()=>{
 const native=await readBattery({nativeDevice:{getBatteryInfo:async()=>({batteryLevel:.23,isCharging:true})}});
 const web=await readBattery({navigator:{getBattery:async()=>({level:.23,charging:true})}});
 assert.equal(native.battery,23);assert.equal(web.battery,23);assert.equal(native.source,'native');assert.equal(web.source,'web');
});
function fixture(overrides={}){let now=100000,visible=true,calls=[],reading={battery:80,charging:false,source:'web'},interval,cleared=false;
 const reporter=createBatteryReporter({read:async()=>reading,send:async(p,signal)=>calls.push({p,signal}),visible:()=>visible,clock:()=>now,timers:{setInterval(fn){interval=fn;return 42},clearInterval(id){assert.equal(id,42);cleared=true}},...overrides});
 return {reporter,calls,setNow(n){now=n},setVisible(v){visible=v},setReading(r){reading=r},get cleared(){return cleared}};
}
test('Reporter pauses hidden/offline, deduplicates and refreshes heartbeat',async()=>{
 const f=fixture();await f.reporter.start();assert.equal(f.calls.length,1);await f.reporter.tick();assert.equal(f.calls.length,1);
 f.setNow(161000);await f.reporter.tick();assert.equal(f.calls.length,2);
 f.setVisible(false);f.setNow(222000);await f.reporter.tick();assert.equal(f.calls.length,2);
 f.setVisible(true);f.setReading({battery:0,charging:false,source:'web'});await f.reporter.tick();assert.equal(f.calls.length,3);assert.equal(f.calls[2].p.battery,0);
 f.reporter.stop();assert.ok(f.cleared);assert.equal(f.calls[0].signal.aborted,true);await f.reporter.tick();assert.equal(f.calls.length,3);
});
test('Stopping during a pending reading prevents transmission',async()=>{
 let resolve;const read=new Promise(r=>{resolve=r});let sends=0;
 const f=fixture({read:()=>read,send:async()=>{sends++}});const pending=f.reporter.start();f.reporter.stop();resolve({battery:40,charging:false,source:'web'});await pending;assert.equal(sends,0);
});
test('Failed delivery retries a new reading; no replay of offline data',async()=>{
 let sends=0;const seen=[];const f=fixture({send:async value=>{sends++;seen.push(value.battery);if(sends===1)throw Error('offline')}});
 await f.reporter.start();f.setReading({battery:75,charging:false,source:'web'});await f.reporter.tick();assert.deepEqual(seen,[80,75]);f.reporter.stop();
});
test('Old, invalid and future timestamps are not labelled recent',()=>{
 const now=Date.parse('2026-11-04T12:00:00Z');assert.equal(batteryFreshness('2026-11-04T11:59:00Z',now),'recent');assert.equal(batteryFreshness('2026-11-04T11:50:00Z',now),'stale');assert.equal(batteryFreshness(null,now),'unknown');assert.equal(batteryFreshness('2026-11-04T13:00:00Z',now),'unknown');
});
