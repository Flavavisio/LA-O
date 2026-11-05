-- Applied through Supabase migrations. No secret belongs in this file or Git.
-- Every password UPDATE requires a short-lived permit issued by the Laço server
-- after checking ALL persisted family memberships. INSERT (initial password) is
-- unaffected. Recovery/admin password changes must also use this managed flow.
create table laco_private.password_signing_key (
 id boolean primary key default true check(id),
 secret text not null
);
insert into laco_private.password_signing_key(id,secret)
values(true,encode(extensions.gen_random_bytes(32),'hex'));
alter table laco_private.password_signing_key enable row level security;
create policy no_client_access on laco_private.password_signing_key
 for all to anon,authenticated using(false) with check(false);
revoke all on laco_private.password_signing_key from public,anon,authenticated;

create table laco_private.password_permits (
 nonce uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 expires_at bigint not null,
 used boolean not null default false
);
create index password_permits_user_expiry on laco_private.password_permits(user_id,expires_at);
create index password_permits_expiry on laco_private.password_permits(expires_at);
alter table laco_private.password_permits enable row level security;
create policy no_client_access on laco_private.password_permits
 for all to anon,authenticated using(false) with check(false);
revoke all on laco_private.password_permits from public,anon,authenticated;

create function laco_private.authorize_password_permit(expires_at bigint,nonce uuid,signature text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare uid uuid:=auth.uid(); ts bigint:=floor(extract(epoch from clock_timestamp())); signing_key text; expected text;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if expires_at<=ts or expires_at>ts+20 then raise exception 'Expired password permit' using errcode='42501'; end if;
 select k.secret into signing_key from laco_private.password_signing_key k where k.id=true;
 expected:=encode(extensions.hmac(uid::text||':'||expires_at::text||':'||nonce::text,signing_key,'sha256'),'hex');
 if signature is null or signature!~'^[0-9a-f]{64}$' or signature<>expected then
  raise exception 'Invalid password authorization' using errcode='42501';
 end if;
 delete from laco_private.password_permits p where p.expires_at<ts-86400;
 insert into laco_private.password_permits(nonce,user_id,expires_at) values(nonce,uid,expires_at);
 return true;
end;
$$;
revoke all on function laco_private.authorize_password_permit(bigint,uuid,text) from public,anon,authenticated;
grant execute on function laco_private.authorize_password_permit(bigint,uuid,text) to authenticated;

create function public.laco_password_permit(expires_at bigint,nonce uuid,signature text)
returns boolean language sql security invoker set search_path=''
as $$ select laco_private.authorize_password_permit(expires_at,nonce,signature); $$;
revoke all on function public.laco_password_permit(bigint,uuid,text) from public,anon;
grant execute on function public.laco_password_permit(bigint,uuid,text) to authenticated;

create function laco_private.guard_password_change()
returns trigger language plpgsql security definer set search_path=''
as $$
declare consumed integer;
begin
 if new.encrypted_password is not distinct from old.encrypted_password then return new; end if;
 update laco_private.password_permits p set used=true
 where p.user_id=old.id and not p.used and p.expires_at>=floor(extract(epoch from clock_timestamp()));
 get diagnostics consumed=row_count;
 if consumed=0 then raise exception 'Password changes must be authorized in the Laço adult profile' using errcode='42501'; end if;
 return new;
end;
$$;
revoke all on function laco_private.guard_password_change() from public,anon,authenticated;
create trigger laco_require_password_permit
before update of encrypted_password on auth.users
for each row execute function laco_private.guard_password_change();
