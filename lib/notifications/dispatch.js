import {sendNotification} from './providers.js';
export async function dispatchSOS(db,alertId,env,{send=sendNotification}={}){
 const cutoff=new Date(Date.now()-15*60000).toISOString();
 await db.prepare("UPDATE notification_jobs SET status='expired',updated=? WHERE alert=? AND created<? AND status IN ('queued','configuration','failed')").bind(new Date().toISOString(),alertId,cutoff).run();
 const jobs=(await db.prepare(`SELECT j.id,j.status,j.attempts,d.id AS device_id,d.platform,d.provider,d.token,d.environment,a.id AS alert_id FROM notification_jobs j JOIN notification_devices d ON d.id=j.device_id JOIN alerts a ON a.id=j.alert JOIN families f ON f.id=j.family WHERE j.alert=? AND j.status IN ('queued','configuration','failed') AND j.attempts<3 AND a.status='open' AND f.status='active' AND f.expires>=? AND a.created>=? AND EXISTS(SELECT 1 FROM members m WHERE m.user_id=d.user_id AND m.family=j.family AND m.role='admin' AND m.adult=1) ORDER BY j.created LIMIT 10`).bind(alertId,new Date().toISOString().slice(0,10),cutoff).all()).results;
 // Claims prevent two open panels retrying the same job concurrently. A crash
 // after claiming leaves 'sending', which requires operator reconciliation.
 const results=await Promise.all(jobs.map(async job=>{
  const claimed=await db.prepare("UPDATE notification_jobs SET status='sending',updated=? WHERE id=? AND status=? AND attempts=?").bind(new Date().toISOString(),job.id,job.status,job.attempts).run();
  if(!claimed.meta.changes)return null;
  let result;try{result=await send(job,alertId,env);}catch{result={status:'failed',code:'provider_unavailable'};}
  await db.prepare('UPDATE notification_jobs SET status=?,attempts=attempts+?,last_error=?,updated=? WHERE id=?').bind(result.status,result.status==='configuration'?0:1,result.code,new Date().toISOString(),job.id).run();
  if(result.invalid)await db.prepare('DELETE FROM notification_devices WHERE id=? AND token=?').bind(job.device_id,job.token).run();
  return result.status;
 }));
 const summary=(await db.prepare('SELECT status,COUNT(*) AS count FROM notification_jobs WHERE alert=? GROUP BY status').bind(alertId).all()).results;
 return {devices:summary.reduce((n,r)=>n+r.count,0),sent:summary.find(r=>r.status==='sent')?.count||0,pending:summary.filter(r=>r.status!=='sent').reduce((n,r)=>n+r.count,0)};
}
