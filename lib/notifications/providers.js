// Only provider URLs below can receive keys/tokens. No arbitrary webhook URLs.
const enc=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const part=value=>b64(enc.encode(JSON.stringify(value)));
function pem(value){return Uint8Array.from(atob(value.replace(/-----[^-]+-----/g,'').replace(/\s/g,'')),c=>c.charCodeAt(0));}
async function jwt(header,payload,key,algorithm){const body=part(header)+'.'+part(payload);return body+'.'+b64(await crypto.subtle.sign(algorithm,key,enc.encode(body)));}
export function providerReadiness(env){return {android:!!env.LACO_FCM_SERVICE_ACCOUNT,ios:!!(env.LACO_APNS_KEY&&env.LACO_APNS_KEY_ID&&env.LACO_APNS_TEAM_ID)};}
async function jsonRequest(fetcher,url,options){return fetcher(url,{...options,signal:AbortSignal.timeout(10000),redirect:'error'});}
export async function sendNotification(device,alertId,env,fetcher=fetch){
 const ts=Math.floor(Date.now()/1000);
 const text={title:'Laço · Pedido de ajuda',body:'Existe um pedido SOS no seu círculo. Abra a Laço para responder.'};
 if(!providerReadiness(env)[device.platform==='android'?'android':'ios'])return {status:'configuration',code:'provider_not_configured'};
 try{
  if(device.provider==='fcm'&&device.platform==='android'){
   const account=JSON.parse(env.LACO_FCM_SERVICE_ACCOUNT);
   if(!/^[a-z][a-z0-9-]{4,62}$/.test(account.project_id)||!account.client_email?.endsWith('.gserviceaccount.com'))throw Error('configuration');
   const key=await crypto.subtle.importKey('pkcs8',pem(account.private_key),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
   const assertion=await jwt({alg:'RS256',typ:'JWT'},{iss:account.client_email,scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:ts,exp:ts+3600},key,'RSASSA-PKCS1-v1_5');
   const auth=await jsonRequest(fetcher,'https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}).toString()});
   if(!auth.ok)return {status:'failed',code:'provider_auth_failed'};
   const {access_token}=await auth.json();if(!access_token)return {status:'failed',code:'provider_auth_failed'};
   const r=await jsonRequest(fetcher,`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,{method:'POST',headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},body:JSON.stringify({message:{token:device.token,notification:text,data:{kind:'sos',alert:alertId},android:{priority:'high',ttl:'60s',collapse_key:alertId,notification:{channel_id:'laco_sos',sound:'default'}}}})});
   if(r.ok)return {status:'sent',code:null};
   const detail=await r.json().catch(()=>null);
   const invalid=detail?.error?.details?.some(d=>d.errorCode==='UNREGISTERED');
   return {status:'failed',code:invalid?'token_invalid':'provider_rejected',invalid};
  }
  if(device.provider==='apns'&&device.platform==='ios'){
   if(!/^[A-Z0-9]{10}$/.test(env.LACO_APNS_KEY_ID)||! /^[A-Z0-9]{10}$/.test(env.LACO_APNS_TEAM_ID))throw Error('configuration');
   const key=await crypto.subtle.importKey('pkcs8',pem(env.LACO_APNS_KEY),{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
   const token=await jwt({alg:'ES256',kid:env.LACO_APNS_KEY_ID},{iss:env.LACO_APNS_TEAM_ID,iat:ts},key,{name:'ECDSA',hash:'SHA-256'});
   const host=device.environment==='sandbox'?'api.sandbox.push.apple.com':'api.push.apple.com';
   const r=await jsonRequest(fetcher,`https://${host}/3/device/${device.token}`,{method:'POST',headers:{authorization:'bearer '+token,'apns-topic':'pt.laco.familia','apns-push-type':'alert','apns-priority':'10','apns-collapse-id':alertId,'apns-expiration':String(ts+60),'Content-Type':'application/json'},body:JSON.stringify({aps:{alert:text,sound:'default'},kind:'sos',alert:alertId})});
   if(r.ok)return {status:'sent',code:null};
   const detail=await r.json().catch(()=>null);const invalid=['BadDeviceToken','Unregistered'].includes(detail?.reason);
   return {status:'failed',code:invalid?'token_invalid':'provider_rejected',invalid};
  }
  return {status:'failed',code:'invalid_provider'};
 }catch{return {status:'failed',code:'provider_unavailable'};}
}
