import {action,AppError} from '../service.js';
import {supabaseConfig} from '../supabase/config.js';
export function validateInitialPassword(b){
 if(b.existing===true)return;
 if(typeof b.password!=='string'||b.password.length<12||b.password.length>128)throw new AppError('A palavra-passe deve ter entre 12 e 128 caracteres.');
 if(b.password!==b.passwordConfirm)throw new AppError('As palavras-passe não coincidem.');
}
export async function provisionCustomer(db,c,b,authorization,send=fetch){
 if(!c.root)throw new AppError('Esta operação está reservada ao superadmin.',403);
 validateInitialPassword(b);
 let family=b.family;
 if(b.type==='create_family'){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(b.requestId||''))throw new AppError('Pedido inválido. Volte a abrir o formulário.');
  family=b.requestId;
  const previous=await db.prepare('SELECT f.id,m.email FROM families f JOIN members m ON m.family=f.id AND m.is_primary=1 WHERE f.id=?').bind(family).first();
  if(previous&&previous.email!==b.email?.trim().toLowerCase())throw new AppError('O pedido já foi utilizado.',409);
  if(!previous)await action(db,c,b,{provisioning:true,familyId:family});
 }
 const member=await db.prepare('SELECT id,name,email,user_id FROM members WHERE family=? AND is_primary=1').bind(family).first();
 if(!member)throw new AppError('Administrador principal não encontrado.',404);
 if(member.user_id){
  // A retry may have completed before the browser received the response.
  if(b.type==='create_family')return {ok:true,id:family};
  throw new AppError('Esta conta já tem acesso associado. A palavra-passe só pode ser alterada pelo próprio no perfil.',409);
 }
 try{
  const r=await send(supabaseConfig.url+'/functions/v1/laco-create-customer',{method:'POST',headers:{'Content-Type':'application/json',apikey:supabaseConfig.publishableKey,Authorization:authorization||''},body:JSON.stringify({requestId:family,email:member.email,name:member.name,password:b.password,existing:b.existing===true})});
  const result=await r.json();
  if(!r.ok)throw new AppError(result.error||'Não foi possível criar o acesso.',r.status);
  if(!/^[0-9a-f-]{36}$/i.test(result.userId||''))throw new AppError('O serviço não confirmou o acesso.',502);
  const linked=await db.prepare('UPDATE members SET user_id=? WHERE id=? AND user_id IS NULL').bind('supabase:'+result.userId,member.id).run();
  if(!linked.meta.changes){const current=await db.prepare('SELECT user_id FROM members WHERE id=?').bind(member.id).first();if(current?.user_id!=='supabase:'+result.userId)throw new AppError('O acesso foi alterado. Atualize a página.',409);}
  await db.prepare("UPDATE families SET status='active' WHERE id=? AND status='provisioning'").bind(family).run();
  await db.prepare('INSERT INTO audit(id,family,actor,action,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),family,c.user.userId,b.existing===true?'Conta existente associada':'Acesso do cliente criado',new Date().toISOString()).run();
  return {ok:true,id:family};
 }catch(e){const error=new AppError(e instanceof AppError?e.message:'O acesso ficou por concluir. Tente novamente na lista de clientes.',e instanceof AppError?e.status:502);error.pendingFamily=family;throw error;}
}
