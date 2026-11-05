const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export function createHandler({caller,admin}){return async request=>{
 try{
  if(request.method!=='POST')return reply({error:'Método não permitido.'},405);
  const authorization=request.headers.get('authorization');
  if(!authorization?.startsWith('Bearer '))return reply({error:'Entre na sua conta.'},401);
  const scoped=caller(authorization);
  const {data:identity,error:identityError}=await scoped.auth.getUser();
  if(identityError||!identity?.user?.email_confirmed_at)return reply({error:'Sessão inválida.'},401);
  const {data:access,error:roleError}=await scoped.rpc('laco_platform_access');
  if(roleError||access?.superadmin!==true)return reply({error:'Apenas o superadmin pode criar contas.'},403);
  const raw=await request.text();if(new TextEncoder().encode(raw).length>10000)return reply({error:'Pedido demasiado grande.'},413);
  const b=JSON.parse(raw),email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>200||!/^\b[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b$/i.test(b.requestId||''))return reply({error:'Dados de conta inválidos.'},400);
  if(b.existing!==true&&(typeof b.password!=='string'||b.password.length<12||b.password.length>128))return reply({error:'A palavra-passe deve ter entre 12 e 128 caracteres.'},400);
  const lookup=async()=>{const r=await admin.rpc('laco_customer_account',{customer_email:email,request_id:b.requestId});if(r.error)throw new Error('lookup');return r.data;};
  let existing=await lookup();
  if(existing){
   if(!existing.confirmed)return reply({error:'A conta existente ainda não confirmou o e-mail.'},409);
   if(existing.same_request||b.existing===true)return reply({userId:existing.id});
   return reply({error:'Este e-mail já tem conta. Selecione «Associar conta existente». A palavra-passe atual será mantida.'},409);
  }
  if(b.existing===true)return reply({error:'Não existe uma conta confirmada com este e-mail.'},404);
  const {data,error}=await admin.auth.admin.createUser({email,password:b.password,email_confirm:true,user_metadata:{full_name:typeof b.name==='string'?b.name.slice(0,120):''},app_metadata:{laco_provision_request:b.requestId}});
  if(error){existing=await lookup();if(existing?.same_request&&existing.confirmed)return reply({userId:existing.id});return reply({error:'Não foi possível criar a conta. Confirme se o e-mail já existe e se a palavra-passe cumpre os requisitos.'},409);}
  return reply({userId:data.user.id});
 }catch{return reply({error:'Não foi possível criar o acesso. Tente novamente.'},502);}
};}
