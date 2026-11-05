// Verify the entire account, never just the family selected in the browser.
export function passwordAccess(c){
 const minor=!!c?.memberships?.some(m=>m.adult!==1&&m.adult!==true);
 return {minor,canChangePassword:!!(c?.user?.authProvider==='supabase'&&!minor&&(c.root||c.memberships?.some(m=>m.adult===1||m.adult===true)))};
}
export async function signPasswordPermit(secret,userId,expires,nonce){
 if(typeof secret!=='string'||secret.length<64)throw new Error('Password authorization unavailable');
 const bytes=new TextEncoder();
 const key=await crypto.subtle.importKey('raw',bytes.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=await crypto.subtle.sign('HMAC',key,bytes.encode(userId+':'+expires+':'+nonce));
 return Array.from(new Uint8Array(signature),v=>v.toString(16).padStart(2,'0')).join('');
}
