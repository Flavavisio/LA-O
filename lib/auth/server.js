import {createClient} from '@supabase/supabase-js';
import {supabaseConfig} from '../supabase/config';
import {verifiedSupabaseUser} from './identity';
import {withPlatformRole} from './platform-role';
import {requireApplicationUser} from './request-user';
export async function getApplicationUser(request){
 return requireApplicationUser(request,async token=>{
  const client=createClient(supabaseConfig.url,supabaseConfig.publishableKey,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const user=await verifiedSupabaseUser(token,client);
  return user?withPlatformRole(user,client):null;
 });
}

