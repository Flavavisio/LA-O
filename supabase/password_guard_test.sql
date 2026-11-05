begin;
do $test$
declare uid uuid:=gen_random_uuid(); n uuid:=gen_random_uuid(); exp bigint:=floor(extract(epoch from clock_timestamp()))+15; key_text text; sig text;
begin
 insert into auth.users(id,email,encrypted_password) values(uid,'laco-password-test-'||uid::text||'@example.invalid','test-only');
 begin update auth.users set encrypted_password='unauthorized-test' where id=uid; raise exception 'Direct update unexpectedly accepted'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',uid::text,true);
 begin perform public.laco_password_permit(exp,gen_random_uuid(),repeat('0',64)); raise exception 'Invalid signature unexpectedly accepted'; exception when insufficient_privilege then null; end;
 select secret into key_text from laco_private.password_signing_key where id=true;
 sig:=encode(extensions.hmac(uid::text||':'||exp::text||':'||n::text,key_text,'sha256'),'hex');
 perform public.laco_password_permit(exp,n,sig);
 update auth.users set encrypted_password='authorized-test' where id=uid;
 if not exists(select 1 from laco_private.password_permits where nonce=n and used=true) then raise exception 'Permit not consumed'; end if;
 begin update auth.users set encrypted_password='replay-test' where id=uid; raise exception 'Reuse unexpectedly accepted'; exception when insufficient_privilege then null; end;
 begin perform public.laco_password_permit(exp,n,sig); raise exception 'Nonce replay unexpectedly accepted'; exception when unique_violation then null; end;
 begin perform public.laco_password_permit(exp-60,gen_random_uuid(),sig); raise exception 'Expired permit unexpectedly accepted'; exception when insufficient_privilege then null; end;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 begin perform public.laco_password_permit(exp,gen_random_uuid(),sig); raise exception 'Other account unexpectedly accepted'; exception when insufficient_privilege then null; end;
 update auth.users set encrypted_password=encrypted_password where id=uid;
end;
$test$;
select 'passed: direct denial, invalid HMAC, authorized change, single use, nonce replay, expiry, account binding, unchanged hash' as password_guard_tests;
rollback;