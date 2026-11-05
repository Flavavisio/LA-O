import {AppError} from '../service.js';
// Native HTTP has no browser Origin. It still needs the verified bearer checked
// by getApplicationUser; a header's presence alone never grants authorization.
export function assertWriteOrigin(request){
 const origin=request.headers.get('origin');
 if(origin===new URL(request.url).origin)return;
 const nativeOrigin=!origin||['capacitor://localhost','https://localhost','http://localhost'].includes(origin);
 if(nativeOrigin&&/^Bearer \S+$/i.test(request.headers.get('authorization')||''))return;
 throw new AppError('Origem inválida.',403);
}
