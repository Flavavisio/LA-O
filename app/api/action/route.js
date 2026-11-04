import { env } from 'cloudflare:workers';
import { getApplicationUser } from '../../../lib/auth/server';
import { context,action } from '../../../lib/service';
export const dynamic='force-dynamic';
export async function POST(request){
  try {
    const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return Response.json({error:'Origem inválida.'},{status:403});
    if(!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Formato inválido.'},{status:415});
    if(Number(request.headers.get('content-length')||0)>10000)return Response.json({error:'Pedido demasiado grande.'},{status:413});
    const body=await request.json();const c=await context(env.DB,await getApplicationUser(request));return Response.json(await action(env.DB,c,body),{headers:{'Cache-Control':'no-store'}});
  }catch(e){if(!e.status)console.error('action request failed',e);return Response.json({error:e.status?e.message:'Não foi possível guardar. Tente novamente.'},{status:e.status||500,headers:{'Cache-Control':'no-store'}});}
}
