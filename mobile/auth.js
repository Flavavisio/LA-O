import {createClient} from '@supabase/supabase-js';
import {Capacitor,CapacitorHttp} from '@capacitor/core';
import {SecureStorage,KeychainAccess} from '@aparajita/capacitor-secure-storage';
import {createSessionStorage,SESSION_KEY} from './session-storage.js';
import {supabaseConfig} from '../lib/supabase/config.js';
export async function createNativeAuth(){
 if(!Capacitor.isNativePlatform())throw Error('Esta versão deve ser aberta na app Android ou iPhone.');
 await SecureStorage.setKeyPrefix('laco_');await SecureStorage.setSynchronize(false);
 await SecureStorage.setDefaultKeychainAccess(KeychainAccess.afterFirstUnlockThisDeviceOnly);
 const storage={getItem:async k=>await SecureStorage.get(k,false),setItem:async(k,v)=>SecureStorage.set(k,v,false,false),removeItem:async k=>{await SecureStorage.remove(k,false)}};
 const sessionStorage=await createSessionStorage(SecureStorage);
 const listeners=new Set();let subscription,client;
 const notify=(event,session)=>{for(const listener of listeners)listener(event,session)};
 const nativeFetch=async(input,init)=>{
  const request=new Request(input,init);
  if(new URL(request.url).origin!==supabaseConfig.url)throw Error('Destino de autenticação inválido.');
  const raw=['GET','HEAD'].includes(request.method)?null:await request.text();
  const r=await CapacitorHttp.request({url:request.url,method:request.method,headers:Object.fromEntries(request.headers),...(raw?{data:JSON.parse(raw)}:{}),responseType:'json',disableRedirects:true,connectTimeout:15000,readTimeout:15000});
  return new Response([204,205,304].includes(r.status)?null:typeof r.data==='string'?r.data:JSON.stringify(r.data),{status:r.status,headers:{'Content-Type':'application/json'}});
 };
 function replaceClient(){subscription?.unsubscribe();client=createClient(supabaseConfig.url,supabaseConfig.publishableKey,{global:{fetch:nativeFetch},auth:{storage:sessionStorage.adapter(),persistSession:true,autoRefreshToken:!sessionStorage.isBlocked(),detectSessionInUrl:false,storageKey:SESSION_KEY}});subscription=client.auth.onAuthStateChange(notify).data.subscription;}
 replaceClient();
 let installation=await SecureStorage.get('installation',false);if(!installation){installation=crypto.randomUUID();await SecureStorage.set('installation',installation,false,false);}
 return {get client(){return client},installation,storage,onChange:callback=>{listeners.add(callback);return()=>listeners.delete(callback)},async lockSession(){const locked=sessionStorage.lock();client.auth.stopAutoRefresh().catch(()=>{});await locked;replaceClient();},async prepareLogin(){await client.auth.stopAutoRefresh();await sessionStorage.unlock();replaceClient();}};
}
