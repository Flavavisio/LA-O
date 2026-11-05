-- Only the Edge Function's server credential can look up Auth accounts.
create or replace function laco_private.customer_account(customer_email text,request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'Forbidden' using errcode='42501'; end if;
 select jsonb_build_object('id',u.id,'confirmed',u.email_confirmed_at is not null,'same_request',coalesce(u.raw_app_meta_data->>'laco_provision_request','')=request_id::text) into result from auth.users u where lower(u.email)=lower(customer_email) limit 1;
 return result;
end;$$;
create or replace function public.laco_customer_account(customer_email text,request_id uuid)
returns jsonb language sql security invoker set search_path='' as $$ select laco_private.customer_account(customer_email,request_id); $$;
revoke all on function laco_private.customer_account(text,uuid) from public,anon,authenticated;
revoke all on function public.laco_customer_account(text,uuid) from public,anon,authenticated;
grant usage on schema laco_private to service_role;
grant execute on function laco_private.customer_account(text,uuid) to service_role;
grant execute on function public.laco_customer_account(text,uuid) to service_role;
