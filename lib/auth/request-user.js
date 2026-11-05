import {AppError} from '../service.js';

// Hosting identity never grants access to family data. A verified Laço session
// is required, including when the public index is visited through ChatGPT.
export async function requireApplicationUser(request,verify){
 const match=/^Bearer (\S+)$/i.exec(request.headers.get('authorization')||'');
 if(!match)throw new AppError('Entre na sua conta Laço para continuar.',401);
 let user;
 try{user=await verify(match[1]);}
 catch{throw new AppError('Não foi possível verificar as permissões. Tente novamente.',503);}
 if(!user)throw new AppError('A sessão expirou ou não é válida. Entre novamente.',401);
 return user;
}
