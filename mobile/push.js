export function createPush({plugin,platform,installation,api,onStatus,onOpen,getState}){
 const handles=[];
 async function register({requestPermissions=true}={}){
  let permission=await plugin.checkPermissions();if(permission.receive!=='granted'&&requestPermissions)permission=await plugin.requestPermissions();
  if(permission.receive!=='granted')throw Error('As notificações não foram autorizadas no telemóvel.');
  if(platform==='android')await plugin.createChannel({id:'laco_sos',name:'Pedidos de ajuda Laço',description:'Avisos SOS do seu círculo',importance:5,visibility:0});
  const ready=getState()?.notifications?.[platform==='android'?'android':'ios'];
  if(!ready){onStatus('Permissão concedida. O envio push aguarda a configuração do serviço Laço.');return false;}
  await plugin.register();return true;
 }
 async function start(){
  handles.push(await plugin.addListener('registration',async token=>{try{await api('/api/action',{type:'register_device',installation,platform,provider:platform==='ios'?'apns':'fcm',environment:import.meta.env.VITE_APNS_ENV==='production'?'production':'sandbox',token:token.value});onStatus('Este telemóvel está registado para receber avisos.');}catch{onStatus('Não foi possível registar este telemóvel para avisos.');}}));
  handles.push(await plugin.addListener('registrationError',()=>onStatus('Não foi possível ativar os avisos. Verifique a configuração e a ligação.')));
  handles.push(await plugin.addListener('pushNotificationReceived',()=>onStatus('Recebeu um pedido de ajuda. Abra os alertas.')));
  handles.push(await plugin.addListener('pushNotificationActionPerformed',event=>Promise.resolve(onOpen({family:event.notification?.data?.family,alert:event.notification?.data?.alert})).catch(()=>onStatus('Abra a Laço e consulte os alertas do seu círculo.'))));
 }
 async function remove(){try{await api('/api/action',{type:'unregister_device',installation});}finally{await plugin.unregister().catch(()=>{});}}
 return {start,register,remove,dispose:()=>Promise.all(handles.map(h=>h.remove()))};
}
