export function withDeadline(task,ms=4000){let timer;return Promise.race([Promise.resolve().then(task),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('timeout')),ms)})]).finally(()=>clearTimeout(timer));}
// Local session removal is mandatory. Network, GPS and push cleanup cannot block it.
export async function finishLogout({lockSession,stopTracking,removePush,revokeSession,deadline=withDeadline}){
 const tasks=[stopTracking,removePush,revokeSession].map(task=>deadline(task).then(()=>true,()=>false));
 await deadline(lockSession,6000);
 const cleanup=await Promise.all(tasks);
 return {remoteRevoked:cleanup[2],deviceCleanup:cleanup[0]&&cleanup[1]};
}
export function createRequestFence(){let generation=0,blocked=false;return {capture:()=>generation,current:id=>!blocked&&id===generation,blocked:()=>blocked,close(){blocked=true;generation++},open(){blocked=false;generation++}};}
