import test from 'node:test';
import assert from 'node:assert/strict';
import {sendNotification,providerReadiness} from '../lib/notifications/providers.js';
async function keyPEM(algorithm){const key=await crypto.subtle.generateKey(algorithm,true,['sign','verify']);const bytes=await crypto.subtle.exportKey('pkcs8',key.privateKey);return '-----BEGIN PRIVATE KEY-----\n'+Buffer.from(bytes).toString('base64')+'\n-----END PRIVATE KEY-----';}
test('Missing provider configuration never claims a notification was sent',async()=>{
 assert.deepEqual(providerReadiness({}),{android:false,ios:false});assert.deepEqual(await sendNotification({platform:'android',provider:'fcm'},'alert',{},()=>assert.fail('must not call network')),{status:'configuration',code:'provider_not_configured'});
});
test('FCM uses OAuth and the fixed Google endpoint; the lock-screen payload contains no names or coordinates',async()=>{
 const private_key=await keyPEM({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'});const env={LACO_FCM_SERVICE_ACCOUNT:JSON.stringify({private_key,project_id:'laco-test',client_email:'sender@laco-test.iam.gserviceaccount.com',token_uri:'https://untrusted.example'})};const calls=[];
 const result=await sendNotification({platform:'android',provider:'fcm',token:'device-token'},'alert-id',env,async(url,options)=>{calls.push({url,options});return calls.length===1?Response.json({access_token:'oauth-test'}):Response.json({name:'accepted'})});
 assert.equal(result.status,'sent');assert.equal(calls[0].url,'https://oauth2.googleapis.com/token');assert.equal(calls[1].url,'https://fcm.googleapis.com/v1/projects/laco-test/messages:send');
 const payload=JSON.parse(calls[1].options.body);assert.equal(payload.message.token,'device-token');assert.equal(payload.message.android.ttl,'60s');assert.deepEqual(payload.message.data,{kind:'sos',alert:'alert-id'});assert.equal(calls[1].options.redirect,'error');
});
test('APNs uses its own token format, environment, ES256 signature and short expiry',async()=>{
 const env={LACO_APNS_KEY:await keyPEM({name:'ECDSA',namedCurve:'P-256'}),LACO_APNS_KEY_ID:'KEYID12345',LACO_APNS_TEAM_ID:'TEAM123456'};let request;
 const result=await sendNotification({platform:'ios',provider:'apns',token:'a'.repeat(64),environment:'sandbox'},'alert-id',env,async(url,options)=>{request={url,options};return new Response(null,{status:200})});assert.equal(result.status,'sent');assert.ok(request.url.startsWith('https://api.sandbox.push.apple.com/3/device/'));assert.equal(request.options.headers['apns-topic'],'pt.laco.familia');assert.ok(Number(request.options.headers['apns-expiration'])>Date.now()/1000);
 const signature=request.options.headers.authorization.split('.')[2];assert.equal(Buffer.from(signature,'base64url').length,64);
});
test('Malformed provider credentials fail without transmitting to a configurable destination',async()=>{
 const result=await sendNotification({platform:'android',provider:'fcm'},'id',{LACO_FCM_SERVICE_ACCOUNT:JSON.stringify({project_id:'../../other',client_email:'x'})},()=>assert.fail('must not call network'));assert.equal(result.status,'failed');
});
