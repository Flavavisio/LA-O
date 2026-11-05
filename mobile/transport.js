export const API_ORIGIN='https://laco-familia.flowy-mouse-8040.chatgpt.site';
export function createAPI({http,getToken}){
 return async function api(path,body){
  if(typeof path!=='string'||!/^\/api\/(?:state(?:\?family=[^#]*)?|action|profile\/password-permit)$/.test(path))throw Error('Destino não autorizado.');
  const token=await getToken();if(!token)throw Object.assign(Error('Entre novamente na Laço.'),{status:401});
  const response=await http.request({url:API_ORIGIN+path,method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+token,...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{data:body}),responseType:'json',connectTimeout:15000,readTimeout:20000,disableRedirects:true});
  let data;try{data=typeof response.data==='string'?JSON.parse(response.data):response.data;}
  catch{throw Object.assign(Error('A ligação à Laço não devolveu uma resposta válida. Tente novamente.'),{status:response.status});}
  if(response.status<200||response.status>=300)throw Object.assign(Error(data?.error||'Não foi possível contactar a Laço.'),{status:response.status});
  return data;
 };
}
