export async function verifiedSupabaseUser(token,client,{bootstrapEmail='',trustedPreviewEmail=''}={}){
 if(typeof token!=='string'||!token||token.length>10000)return null;
 let result;try{result=await client.auth.getUser(token)}catch{return null}
 const user=result?.data?.user;
 if(result?.error||!user?.id||!user.email||!user.email_confirmed_at)return null;
 const email=user.email.toLowerCase();
 const allowed=[bootstrapEmail,trustedPreviewEmail].filter(Boolean).map(x=>x.trim().toLowerCase());
 return {userId:'supabase:'+user.id,email,displayName:user.user_metadata?.full_name||user.email,fullName:user.user_metadata?.full_name||null,authProvider:'supabase',canBootstrap:allowed.includes(email)};
}
