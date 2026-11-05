import { env } from 'cloudflare:workers';
import { getApplicationUser } from '../../../lib/auth/server';
import { context,action } from '../../../lib/service';
import {assertWriteOrigin} from '../../../lib/auth/write-origin';
import {dispatchSOS} from '../../../lib/notifications/dispatch';
import {getRuntimeContext} from '../../../lib/runtime-context';
export const dynamic='force-dynamic';
export async function POST(request){
  try {
    assertWriteOrigin(request);
    if(!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Formato inválido.'},{status:415});
    if(Number(request.headers.get('content-length')||0)>10000)return Response.json({error:'Pedido demasiado grande.'},{status:413});
    const raw=await request.text();if(new TextEncoder().encode(raw).length>10000)return Response.json({error:'Pedido demasiado grande.'},{status:413});
    const body=JSON.parse(raw);const c=await context(env.DB,await getApplicationUser(request));const result=await action(env.DB,c,body);
    if(result.dispatchAlert){
      const task=dispatchSOS(env.DB,result.dispatchAlert,env).catch(()=>{});
      const execution=getRuntimeContext();if(execution)execution.waitUntil(task);else await task;
      delete result.dispatchAlert;
      result.push='queued';
    }
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  }catch(e){if(!e.status)console.error('action request failed',e);return Response.json({error:e.status?e.message:'Não foi possível guardar. Tente novamente.'},{status:e.status||500,headers:{'Cache-Control':'no-store'}});}
}
