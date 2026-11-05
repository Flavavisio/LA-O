import {createClient} from '@supabase/supabase-js';
import {getChatGPTUser} from '../../app/chatgpt-auth';
import {supabaseConfig} from '../supabase/config';
import {verifiedSupabaseUser} from './identity';
import {withPlatformRole} from './platform-role';
import {AppError} from '../service';
export async function getApplicationUser(request){
 const header=request.headers.get('authorization');
 if(header!==null){
  const match=/^Bearer (\S+)$/i.exec(header);if(!match)throw new AppError('Sessão inválida. Entre novamente.',401);
  const client=createClient(supabaseConfig.url,supabaseConfig.publishableKey,{global:{headers:{Authorization:'Bearer '+match[1]}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const user=await verifiedSupabaseUser(match[1],client);
  if(!user)throw new AppError('A sessão expirou ou não é válida. Entre novamente.',401);
  try{return await withPlatformRole(user,client)}catch{throw new AppError('Não foi possível verificar as permissões. Tente novamente.',503)}
 }
 // Preserve the existing owner-private Sites preview identity. Supabase login takes
 // precedence whenever a bearer is present; an invalid bearer never falls back.
 return getChatGPTUser();
}

