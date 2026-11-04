import { canManageSharing } from './sharing-policy.js';
// All permissions are enforced here, independently of the selected screen.
export class AppError extends Error { constructor(message,status=400){super(message);this.status=status;} }
const fail=(s,n=400)=>{throw new AppError(s,n)};
const id=()=>crypto.randomUUID();
const text=(v,max=120)=>typeof v==='string'?v.trim().slice(0,max):'';
const email=v=>{const s=text(v,200).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))fail('Indique um e-mail válido.');return s;};
const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||isNaN(Date.parse(v+'T23:59:59Z'))||new Date(v+'T12:00:00Z').toISOString().slice(0,10)!==v)fail('Indique uma validade válida.');return v;};
const seats=v=>{const n=Number(v);if(!Number.isInteger(n)||n<1||n>100)fail('A licença permite entre 1 e 100 familiares.');return n;};
const now=()=>new Date().toISOString();
export const active=f=>f.status==='active'&&f.expires>=now().slice(0,10);
export async function context(db,user){
  if(!user?.userId||!user?.email)fail('Entre na sua conta para continuar.',401);
  const root=await db.prepare('SELECT owner FROM system WHERE id=1').first();
  // Email is only used to redeem a prepared membership. Identity then binds to a stable user ID.
  await db.prepare('UPDATE members SET user_id=? WHERE email=? AND user_id IS NULL').bind(user.userId,user.email.toLowerCase()).run();
  const memberships=(await db.prepare('SELECT * FROM members WHERE user_id=?').bind(user.userId).all()).results;
  return {user,root:root?.owner===user.userId,setup:!root,memberships};
}
async function familyContext(db,c,fid,admin=false){
  const f=await db.prepare('SELECT * FROM families WHERE id=?').bind(fid).first();
  const m=await db.prepare('SELECT * FROM members WHERE family=? AND user_id=?').bind(fid,c.user.userId).first();
  if(!f||!m||(admin&&m.role!=='admin'))fail('Sem autorização para esta família.',403);
  return {f,m};
}
async function audit(db,c,action,family=null){await db.prepare('INSERT INTO audit(id,family,actor,action,created) VALUES(?,?,?,?,?)').bind(id(),family,c.user.userId,action,now()).run();}
export async function state(db,c,fid){
  const base={user:{name:c.user.displayName,email:c.user.email},superadmin:c.root,setup:c.setup&&c.user.canBootstrap!==false,memberships:c.memberships.map(m=>({id:m.id,family:m.family,name:m.name,role:m.role}))};
  if(c.root){base.families=(await db.prepare('SELECT f.*, (SELECT COUNT(*) FROM members m WHERE m.family=f.id) AS used, (SELECT name FROM members m WHERE m.family=f.id AND is_primary=1) AS admin_name,(SELECT email FROM members m WHERE m.family=f.id AND is_primary=1) AS admin_email FROM families f ORDER BY created DESC').all()).results;}
  if(fid){
    const {f,m}=await familyContext(db,c,fid);
    const roster=(await db.prepare('SELECT * FROM members WHERE family=? ORDER BY is_primary DESC,created').bind(fid).all()).results;
    const enabled=active(f);
    base.family=f;base.self=m.id;base.role=m.role;
    base.members=roster.map(p=>{
      const canSee=enabled&&p.consent&&(m.role==='admin'||p.id===m.id);
      return {id:p.id,name:p.name,role:p.role,is_primary:p.is_primary,adult:p.adult,relation:p.relation,consent:p.consent,consent_at:p.consent_at,battery_consent:p.battery_consent,linked:!!p.user_id,email:m.role==='admin'||p.id===m.id?p.email:undefined,lat:canSee?p.lat:null,lng:canSee?p.lng:null,accuracy:canSee?p.accuracy:null,speed:canSee?p.speed:null,updated:canSee?p.updated:null,battery:canSee&&p.battery_consent?p.battery:null,charging:canSee&&p.battery_consent&&p.charging!==null?!!p.charging:null,battery_source:canSee&&p.battery_consent?p.battery_source:null,battery_updated:canSee&&p.battery_consent?p.battery_updated:null};
    });
    base.alerts=enabled?(await db.prepare(`SELECT a.*,m.name FROM alerts a JOIN members m ON a.member=m.id WHERE a.family=? ${m.role==='admin'?'':'AND a.member=?'} ORDER BY a.created DESC LIMIT 100`).bind(...(m.role==='admin'?[fid]:[fid,m.id])).all()).results:[];
  }
  return base;
}
export async function action(db,c,b){
  const type=b.type;
  if(type==='setup'){
    // Bootstrap only on the owner-private Site; never expose an unclaimed installation publicly.
    if(c.user.canBootstrap===false)fail('A configuração inicial está reservada ao proprietário autorizado.',403);
    if(!c.setup)fail('O superadmin já está configurado.',409);
    const r=await db.prepare('INSERT OR IGNORE INTO system(id,owner) VALUES(1,?)').bind(c.user.userId).run();
    if(!r.meta.changes)fail('O superadmin já está configurado.',409);
    await audit(db,c,'Superadmin configurado');return {ok:true};
  }
  if(['create_family','license','family_status'].includes(type)){
    if(!c.root)fail('Esta operação está reservada ao superadmin.',403);
    if(type==='create_family'){
      const name=text(b.name),admin=text(b.admin),mail=email(b.email),capacity=seats(b.seats),expires=date(b.expires);
      if(!name||!admin)fail('Preencha o nome da família e do administrador.');
      const fid=id();await db.batch([
        db.prepare('INSERT INTO families(id,name,seats,expires,status,created) VALUES(?,?,?,?,?,?)').bind(fid,name,capacity,expires,'active',now()),
        db.prepare('INSERT INTO members(id,family,name,email,role,is_primary,adult,relation,created) VALUES(?,?,?,?,?,?,?,?,?)').bind(id(),fid,admin,mail,'admin',1,1,'Administrador',now())
      ]);await audit(db,c,'Família criada',fid);return {ok:true,id:fid};
    }
    if(type==='license'){
      const capacity=seats(b.seats),expires=date(b.expires);
      const r=await db.prepare('UPDATE families SET seats=?,expires=? WHERE id=? AND (SELECT COUNT(*) FROM members WHERE family=?)<=?').bind(capacity,expires,b.family,b.family,capacity).run();
      if(!r.meta.changes)fail('A capacidade não pode ser inferior ao número de familiares, incluindo os administradores.',409);
      await audit(db,c,'Licença atualizada',b.family);return {ok:true};
    }
    if(!['active','suspended'].includes(b.status))fail('Estado inválido.');
    const r=await db.prepare('UPDATE families SET status=? WHERE id=?').bind(b.status,b.family).run();if(!r.meta.changes)fail('Família não encontrada.',404);
    await audit(db,c,b.status==='active'?'Família ativada':'Família suspensa',b.family);return {ok:true};
  }
  const {f,m}=await familyContext(db,c,b.family,['add_member','remove_member','ack'].includes(type));
  if(type!=='consent'&&!active(f))fail('A licença está suspensa ou expirada. Contacte o administrador.',403);
  if(type==='add_member'){
    const name=text(b.name),relation=text(b.relation,40),mail=b.email?email(b.email):null,adult=b.adult!==false,role=b.role==='admin'?'admin':'member';
    if(!name||!relation)fail('Preencha o nome e o parentesco.');if(adult&&!mail)fail('Os adultos precisam de e-mail para aceitar a partilha.');if(role==='admin'&&!adult)fail('O administrador tem de ser adulto.');
    // One conditional write serializes seat/admin checks even under concurrent requests.
    try{
      const r=await db.prepare(`INSERT INTO members(id,family,name,email,role,is_primary,adult,relation,created) SELECT ?,?,?,?,?,0,?,?,? WHERE (SELECT COUNT(*) FROM members WHERE family=?) < (SELECT seats FROM families WHERE id=?) AND (? != 'admin' OR (SELECT COUNT(*) FROM members WHERE family=? AND role='admin')<2) RETURNING id`).bind(id(),f.id,name,mail,role,adult?1:0,relation,now(),f.id,f.id,role,f.id).first();
      if(!r)fail('Limite de familiares ou de dois administradores atingido.',409);
    }catch(e){if(String(e).includes('UNIQUE'))fail('Este e-mail já está associado à família.',409);throw e;}
    await audit(db,c,'Familiar adicionado',f.id);return {ok:true};
  }
  if(type==='remove_member'){
    const target=await db.prepare('SELECT * FROM members WHERE id=? AND family=?').bind(b.member,f.id).first();
    if(!target||target.is_primary||target.id===m.id)fail('Não pode remover o administrador principal nem a sua própria conta.',403);
    await db.batch([db.prepare('DELETE FROM alerts WHERE member=?').bind(target.id),db.prepare('DELETE FROM members WHERE id=? AND family=?').bind(target.id,f.id)]);
    await audit(db,c,'Familiar removido',f.id);return {ok:true};
  }
  if(type==='consent'){
    if(typeof b.value!=='boolean')fail('A autorização deve ser verdadeira ou falsa.');
    const target=await db.prepare('SELECT * FROM members WHERE id=? AND family=?').bind(b.member,f.id).first();
    if(!target)fail('Familiar não encontrado.',404);
    if(target.adult&&target.id!==m.id)fail('Só o próprio adulto pode aceitar ou revogar a partilha.',403);
    if(!canManageSharing(m,target))fail('Apenas os administradores responsáveis podem ativar ou desativar a partilha de um menor.',403);
    if(b.value&&!active(f))fail('A licença não está ativa.',403);
    await db.prepare('UPDATE members SET consent=?,battery_consent=?,consent_at=?,consent_by=?,lat=NULL,lng=NULL,accuracy=NULL,speed=NULL,updated=NULL,battery=NULL,charging=NULL,battery_source=NULL,battery_updated=NULL WHERE id=? AND family=?').bind(b.value?1:0,b.value?1:0,now(),c.user.userId,target.id,f.id).run();
    await audit(db,c,b.value?'Partilha autorizada':'Partilha revogada',f.id);return {ok:true};
  }
  if(type==='battery'){
    if(!m.consent||!m.battery_consent)fail('Autorize a partilha da bateria antes de enviar o seu estado.',403);
    if(b.member!==undefined&&b.member!==m.id)fail('Só pode enviar a bateria da sua própria conta.',403);
    if(!Number.isInteger(b.battery)||b.battery<0||b.battery>100||typeof b.charging!=='boolean'||!['web','native'].includes(b.source))fail('Leitura de bateria inválida.');
    // No target ID from the client. Identity and family come from the authenticated membership.
    // Consent and license are checked again IN the write to handle concurrent revocations.
    const r=await db.prepare(`UPDATE members SET battery=?,charging=?,battery_source=?,battery_updated=? WHERE id=? AND user_id=? AND consent=1 AND battery_consent=1 AND EXISTS(SELECT 1 FROM families WHERE id=members.family AND status='active' AND expires>=?)`).bind(b.battery,b.charging?1:0,b.source,now(),m.id,c.user.userId,now().slice(0,10)).run();
    if(!r.meta.changes)fail('A partilha ou a licença já não está ativa.',403);
    return {ok:true};
  }
  if(type==='location'){
    if(!m.consent)fail('Autorize a partilha antes de enviar a localização.',403);
    const {lat,lng,accuracy,speed}=b;
    if(typeof lat!=='number'||!Number.isFinite(lat)||lat< -90||lat>90||typeof lng!=='number'||!Number.isFinite(lng)||lng< -180||lng>180||typeof accuracy!=='number'||!Number.isFinite(accuracy)||accuracy<0||accuracy>100000)fail('Coordenadas inválidas.');
    const safeSpeed=typeof speed==='number'&&Number.isFinite(speed)&&speed>=0?Math.min(speed,500):null;
    await db.prepare('UPDATE members SET lat=?,lng=?,accuracy=?,speed=?,updated=? WHERE id=? AND user_id=? AND consent=1').bind(lat,lng,accuracy,safeSpeed,now(),m.id,c.user.userId).run();return {ok:true};
  }
  if(type==='sos'||type==='checkin'){
    const recent=await db.prepare('SELECT id FROM alerts WHERE member=? AND created>?').bind(m.id,new Date(Date.now()-15000).toISOString()).first();if(recent)fail('O pedido anterior já foi registado. Aguarde alguns segundos.',429);
    await db.prepare('INSERT INTO alerts(id,family,member,kind,status,created) VALUES(?,?,?,?,?,?)').bind(id(),f.id,m.id,type,type==='sos'?'open':'resolved',now()).run();return {ok:true};
  }
  if(type==='ack'){
    const r=await db.prepare("UPDATE alerts SET status='resolved',acknowledged_by=?,acknowledged_at=? WHERE id=? AND family=? AND status='open'").bind(m.name,now(),b.alert,f.id).run();if(!r.meta.changes)fail('O alerta já foi tratado ou não existe.',409);await audit(db,c,'SOS confirmado',f.id);return {ok:true};
  }
  fail('Operação desconhecida.');
}
