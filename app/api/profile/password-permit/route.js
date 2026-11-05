import {env} from 'cloudflare:workers';
import {createClient} from '@supabase/supabase-js';
import {getApplicationUser} from '../../../../lib/auth/server';
import {passwordAccess,signPasswordPermit} from '../../../../lib/auth/password-policy';
import {supabaseConfig} from '../../../../lib/supabase/config';
import {context,AppError} from '../../../../lib/service';
import {assertWriteOrigin} from '../../../../lib/auth/write-origin';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function POST(request){
 try{
  assertWriteOrigin(request);
  const user=await getApplicationUser(request);
  const c=await context(env.DB,user);
  if(!passwordAccess(c).canChangePassword)throw new AppError('A alteração da palavra-passe está disponível apenas para contas de adultos associadas à Laço.',403);
  if(!env.LACO_PASSWORD_PERMIT_SECRET)throw new AppError('A alteração de palavra-passe está temporariamente indisponível.',503);
  const token=/^Bearer (\S+)$/i.exec(request.headers.get('authorization')||'')?.[1];
  if(!token||!user.userId.startsWith('supabase:'))throw new AppError('Entre novamente na sua conta.',401);
  const uid=user.userId.slice('supabase:'.length),expires=Math.floor(Date.now()/1000)+15,nonce=crypto.randomUUID();
  const signature=await signPasswordPermit(env.LACO_PASSWORD_PERMIT_SECRET,uid,expires,nonce);
  const client=createClient(supabaseConfig.url,supabaseConfig.publishableKey,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {error}=await client.rpc('laco_password_permit',{expires_at:expires,nonce,signature});
  if(error)throw new AppError('Não foi possível autorizar a alteração. Tente novamente.',503);
  return Response.json({ok:true},{headers});
 }catch(e){return Response.json({error:e.status?e.message:'Não foi possível autorizar a alteração. Tente novamente.'},{status:e.status||500,headers});}
}
