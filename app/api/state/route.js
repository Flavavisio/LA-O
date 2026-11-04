import { env } from 'cloudflare:workers';
import { getApplicationUser } from '../../../lib/auth/server';
import { context,state } from '../../../lib/service';
export const dynamic='force-dynamic';
export async function GET(request){
  try {const c=await context(env.DB,await getApplicationUser(request));return Response.json(await state(env.DB,c,new URL(request.url).searchParams.get('family')),{headers:{'Cache-Control':'private, no-store'}});}
  catch(e){if(!e.status)console.error('state request failed',e);return Response.json({error:e.status?e.message:'Não foi possível carregar os dados. Tente novamente.'},{status:e.status||500,headers:{'Cache-Control':'no-store'}});}
}
