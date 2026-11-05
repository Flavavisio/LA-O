import {createClient} from '@supabase/supabase-js';
import {supabaseConfig} from './config';
let browserClient;
export function getSupabaseBrowser(){
 if(typeof window==='undefined')throw new Error('Browser authentication is client-only.');
 return browserClient??=createClient(supabaseConfig.url,supabaseConfig.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey:'laco-auth'}});
}
export async function authFetch(path,options={}){
 // Never attach the family access token to an arbitrary external URL.
 if(typeof path!=='string'||!/^\/api\/(?:state|action|profile\/password-permit)(?:\?|$)/.test(path))throw new Error('Unsupported API destination');
 const {data,error}=await getSupabaseBrowser().auth.getSession();
 if(error)throw error;
 const headers=new Headers(options.headers);
 if(data.session?.access_token)headers.set('Authorization','Bearer '+data.session.access_token);
 return fetch(path,{...options,headers,credentials:'same-origin',cache:'no-store'});
}
