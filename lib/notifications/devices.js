const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const stamp=()=>new Date().toISOString();
export async function deviceAction(db,c,b){
 if(!c.root&&!c.memberships.length)fail('A conta ainda não está associada à Laço.',403);
 if(typeof b.installation!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.installation))fail('Instalação inválida.');
 // A device registration belongs to the authenticated account, never a target
 // user/member supplied by the client. Tokens are never returned by /api/state.
 const deviceId=c.user.userId+':'+b.installation;
 if(b.type==='unregister_device'){
  await db.batch([
   db.prepare("UPDATE notification_jobs SET status='cancelled',updated=? WHERE device_id=? AND status!='sent'").bind(stamp(),deviceId),
   db.prepare('DELETE FROM notification_devices WHERE id=? AND user_id=?').bind(deviceId,c.user.userId)
  ]);return {ok:true};
 }
 if(!['android','ios'].includes(b.platform))fail('Plataforma inválida.');
 const provider=b.platform==='ios'?'apns':'fcm';
 if(b.provider!==provider||typeof b.token!=='string'||(provider==='apns'?!/^[0-9a-f]{64}$/i.test(b.token):!/^[A-Za-z0-9_:\-]{20,4096}$/.test(b.token)))fail('Token de notificações inválido.');
 const token=provider==='apns'?b.token.toLowerCase():b.token;
 const environment=provider==='apns'&&b.environment==='sandbox'?'sandbox':'production';
 const results=await db.batch([
  db.prepare("UPDATE notification_jobs SET status='cancelled',updated=? WHERE device_id IN (SELECT id FROM notification_devices WHERE provider=? AND token=? AND id!=?) AND status!='sent'").bind(stamp(),provider,token,deviceId),
  db.prepare('DELETE FROM notification_devices WHERE provider=? AND token=? AND id!=?').bind(provider,token,deviceId),
  db.prepare(`INSERT INTO notification_devices(id,user_id,platform,provider,token,environment,updated) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM notification_devices WHERE id=?) OR (SELECT COUNT(*) FROM notification_devices WHERE user_id=?)<5 ON CONFLICT(id) DO UPDATE SET token=excluded.token,environment=excluded.environment,updated=excluded.updated`).bind(deviceId,c.user.userId,b.platform,provider,token,environment,stamp(),deviceId,c.user.userId)
 ]);
 if(!results[2].meta.changes)fail('Limite de cinco dispositivos por conta atingido.',409);
 return {ok:true};
}
export function sosStatements(db,{id,family,member,created}){
 return [
  db.prepare("INSERT INTO alerts(id,family,member,kind,status,created) VALUES(?,?,?,'sos','open',?)").bind(id,family,member,created),
  db.prepare(`INSERT INTO notification_jobs(id,alert,family,device_id,status,attempts,created,updated) SELECT ?||':'||d.id,?,?,d.id,'queued',0,?,? FROM notification_devices d WHERE d.updated>=? AND EXISTS(SELECT 1 FROM members m WHERE m.user_id=d.user_id AND m.family=? AND m.role='admin' AND m.adult=1)`).bind(id,id,family,created,created,new Date(Date.parse(created)-30*86400000).toISOString(),family)
 ];
}
