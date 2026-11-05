export function ownMember(state){return state?.members?.find(m=>m.id===state.self);}
export function mayTrack(state,clock=Date.now()){
 const self=ownMember(state);
 return !!(self?.consent&&state?.family?.status==='active'&&state.family.expires>=new Date(clock).toISOString().slice(0,10));
}
export function currentLocation(location,clock=Date.now()){
 if(!location||location.simulated||!Number.isFinite(location.time)||clock-location.time>120000||location.time>clock+60000)return null;
 const {latitude:lat,longitude:lng,accuracy}=location;
 if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lng)||Math.abs(lng)>180||!Number.isFinite(accuracy)||accuracy<0||accuracy>100000)return null;
 return {lat,lng,accuracy,source:'native',recordedAt:location.time,speed:Number.isFinite(location.speed)&&location.speed>=0?Math.min(location.speed*3.6,500):null};
}
export function createTracking({plugin,loadState,send,readBattery,onStatus=()=>{},clock=Date.now}){
 let watcher=null,starting=false,enabled=false,epoch=0,inFlight=false;
 async function stop(){enabled=false;starting=false;epoch++;const id=watcher;watcher=null;if(id)await plugin.removeWatcher({id});onStatus('Acompanhamento parado neste dispositivo.');}
 async function start({requestPermissions=true}={}){
  if(enabled||starting)return;
  const generation=++epoch;starting=true;
  try{
   const state=await loadState();if(generation!==epoch)return;
   if(!mayTrack(state,clock())){onStatus('A partilha aguarda autorização ou uma licença ativa.');return;}
   enabled=true;
   const id=await plugin.addWatcher({backgroundTitle:'Laço · Localização partilhada',backgroundMessage:'A localização está a ser partilhada com os responsáveis do seu círculo.',requestPermissions,stale:false,distanceFilter:25},async(location,error)=>{
    if(!enabled||generation!==epoch||inFlight)return;
    if(error){onStatus(error.code==='NOT_AUTHORIZED'?'Sem permissão de localização no telemóvel.':'Não foi possível obter a localização.');if(error.code==='NOT_AUTHORIZED')await stop();return;}
    const sample=currentLocation(location,clock());if(!sample)return;
    inFlight=true;
    try{
     // Recheck the server on every sample. No GPS history or offline queue.
     const current=await loadState();if(generation!==epoch||!enabled)return;
     if(!mayTrack(current,clock())){await stop();return;}
     await send({type:'location',family:current.family.id,...sample});
     if(generation!==epoch||!enabled)return;
     if(ownMember(current)?.battery_consent){const battery=await readBattery();if(battery&&generation===epoch&&enabled)await send({type:'battery',family:current.family.id,...battery});}
     onStatus('Última leitura enviada às '+new Date(clock()).toLocaleTimeString('pt-PT')+'.');
    }catch(e){onStatus(e.status===401?'A sessão expirou. Entre novamente.':e.status===403?'A partilha deixou de estar autorizada.':'Sem ligação. A leitura não foi guardada nem enviada.');if([401,403].includes(e.status))await stop();}
    finally{inFlight=false;}
   });
   if(generation!==epoch||!enabled){await plugin.removeWatcher({id});return;}
   watcher=id;onStatus('Acompanhamento ativo. O telemóvel gere a frequência das leituras.');
  }catch(e){if(generation===epoch)enabled=false;throw e;}
  finally{if(generation===epoch)starting=false;}
 }
 return {start,stop,isRunning:()=>enabled};
}
