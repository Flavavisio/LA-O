/** Read permissions from the protected database, never from user metadata. */
export async function withPlatformRole(identity,client){
 if(!identity)return null;
 const result=await client.rpc('laco_platform_access');
 if(result.error)throw new Error('Não foi possível verificar as permissões da plataforma.');
 return {...identity,canBootstrap:false,platformAdmin:result.data?.superadmin===true};
}
