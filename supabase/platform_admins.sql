-- Laço platform administration. Personal reservations are inserted separately.
create schema laco_private;
revoke all on schema laco_private from public, anon;
grant usage on schema laco_private to authenticated;

create table laco_private.platform_admins (
 id uuid primary key default gen_random_uuid(),
 email text not null unique check (email=lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 user_id uuid unique references auth.users(id) on delete cascade,
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table laco_private.platform_admins enable row level security;
revoke all on laco_private.platform_admins from public,anon,authenticated;
grant select on laco_private.platform_admins to authenticated;
create policy own_platform_role on laco_private.platform_admins for select to authenticated using(user_id=(select auth.uid()));

create table laco_private.platform_admin_audit (
 id uuid primary key default gen_random_uuid(),
 actor uuid not null,
 action text not null check(action in ('claim','grant','revoke')),
 target_email text not null,
 created_at timestamptz not null default now()
);
alter table laco_private.platform_admin_audit enable row level security;
revoke all on laco_private.platform_admin_audit from public,anon,authenticated;
create index platform_admin_audit_actor_idx on laco_private.platform_admin_audit(actor,created_at desc);

-- A reservation is claimed only by the CURRENT, confirmed Auth email.
-- User-editable metadata and JWT email claims never confer administrator status.
create function laco_private.claim_platform_admin() returns boolean
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); confirmed_email text; changed_email text;
begin
 if caller is null then return false; end if;
 select lower(u.email) into confirmed_email from auth.users u
 where u.id=caller and u.email_confirmed_at is not null;
 if confirmed_email is null then return false; end if;
 update laco_private.platform_admins set user_id=caller,updated_at=now()
 where user_id is null and enabled and email=confirmed_email
 returning email into changed_email;
 if changed_email is not null then
  insert into laco_private.platform_admin_audit(actor,action,target_email) values(caller,'claim',changed_email);
 end if;
 return exists(select 1 from laco_private.platform_admins where user_id=caller and enabled);
end;
$$;
revoke all on function laco_private.claim_platform_admin() from public,anon;
grant execute on function laco_private.claim_platform_admin() to authenticated;

create function public.laco_platform_access() returns jsonb
language sql volatile security invoker set search_path='' as $$
 select jsonb_build_object('superadmin',laco_private.claim_platform_admin());
$$;
revoke all on function public.laco_platform_access() from public,anon;
grant execute on function public.laco_platform_access() to authenticated;

-- Supports subsequent replacement/addition without hardcoding an owner in code.
create function laco_private.set_platform_admin(target_email text, allow_access boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); normalized text:=lower(btrim(target_email)); existing laco_private.platform_admins;
begin
 if caller is null then raise insufficient_privilege using message='Autenticação necessária.'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('laco.platform_admins'));
 if not laco_private.claim_platform_admin() then raise insufficient_privilege using message='Apenas superadmin.'; end if;
 if normalized is null or normalized !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or allow_access is null then
  raise invalid_parameter_value using message='E-mail ou autorização inválidos.';
 end if;
 select * into existing from laco_private.platform_admins where email=normalized for update;
 if not allow_access and existing.enabled and existing.user_id is not null and
  not exists(select 1 from laco_private.platform_admins where enabled and user_id is not null and id<>existing.id) then
   raise check_violation using message='Ative outro superadmin antes de remover o último.';
 end if;
 insert into laco_private.platform_admins(email,enabled) values(normalized,allow_access)
 on conflict(email) do update set enabled=excluded.enabled,updated_at=now();
 insert into laco_private.platform_admin_audit(actor,action,target_email)
 values(caller,case when allow_access then 'grant' else 'revoke' end,normalized);
 return jsonb_build_object('email',normalized,'enabled',allow_access);
end;
$$;
revoke all on function laco_private.set_platform_admin(text,boolean) from public,anon;
grant execute on function laco_private.set_platform_admin(text,boolean) to authenticated;
create function public.laco_set_platform_admin(target_email text,allow_access boolean) returns jsonb
language sql volatile security invoker set search_path='' as $$
 select laco_private.set_platform_admin(target_email,allow_access);
$$;
revoke all on function public.laco_set_platform_admin(text,boolean) from public,anon;
grant execute on function public.laco_set_platform_admin(text,boolean) to authenticated;
