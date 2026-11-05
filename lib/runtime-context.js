import {AsyncLocalStorage} from 'node:async_hooks';
// Vinext may emit worker and RSC modules separately; both share this singleton.
const key=Symbol.for('laco.runtime-context');
const storage=globalThis[key]??=new AsyncLocalStorage();
export const runWithRuntimeContext=(context,callback)=>storage.run(context,callback);
export const getRuntimeContext=()=>storage.getStore();
