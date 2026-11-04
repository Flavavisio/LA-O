import {createClient} from '@supabase/supabase-js';
import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../app/chatgpt-auth';
import {supabaseConfig} from '../supabase/config';
import {verifiedSupabaseUser} from './identity';
import {AppError} from '../service';
export async function getApplicationUser(request){
 const header=request.headers.get('authorization');
 if(header!==null){
  const match=/^Bearer (\S+)$/i.exec(header);if(!match)throw new AppError('Sessão inválida. Entre novamente.',401);
  const client=createClient(supabaseConfig.url,supabaseConfig.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const preview=await getChatGPTUser();
  const user=await verifiedSupabaseUser(match[1],client,{bootstrapEmail:env.LACO_SUPERADMIN_EMAIL||'',trustedPreviewEmail:preview?.email||''});
  if(!user)throw new AppError('A sessão expirou ou não é válida. Entre novamente.',401);
  return user;
 }
 // Preserve the existing owner-private Sites preview identity. Supabase login takes
 // precedence whenever a bearer is present; an invalid bearer never falls back.
 return getChatGPTUser();
}
