import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {createHandler} from './handler.js';
const url=Deno.env.get('SUPABASE_URL')!;
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const secret=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicKey=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default||Deno.env.get('SUPABASE_ANON_KEY')!;
Deno.serve(createHandler({admin:createClient(url,secret,options),caller:authorization=>createClient(url,publicKey,{...options,global:{headers:{Authorization:authorization}}})}));
