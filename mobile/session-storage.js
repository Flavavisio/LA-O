export const SESSION_KEY='laco-native-session';
const SIGNED_OUT_KEY='session-signed-out';
// Generation-scoped storage prevents an old refresh or delayed logout from touching a new login.
export async function createSessionStorage(secure){
 let blocked=await secure.get(SIGNED_OUT_KEY,false)===true,generation=0;
 let writes=Promise.resolve();
 const queue=fn=>{const task=writes.then(fn);writes=task.catch(()=>{});return task;};
 async function removeSession(){
  const keys=await secure.keys(false);
  for(const key of keys.filter(k=>k===SESSION_KEY||k.startsWith(SESSION_KEY+'-')))await secure.remove(key,false);
 }
 return {
  adapter(){const own=generation;return {getItem:async key=>{if(blocked||own!==generation)return null;const value=await secure.get(key,false);return blocked||own!==generation?null:value},setItem:(key,value)=>queue(async()=>{if(!blocked&&own===generation)await secure.set(key,value,false,false)}),removeItem:key=>queue(async()=>{if(own===generation)await secure.remove(key,false)})};},
  isBlocked:()=>blocked,
  lock(){blocked=true;generation++;return queue(async()=>{await secure.set(SIGNED_OUT_KEY,true,false,false);await removeSession();});},
  async unlock(){blocked=true;generation++;await queue(async()=>{await removeSession();await secure.remove(SIGNED_OUT_KEY,false);});blocked=false;},
 };
}
