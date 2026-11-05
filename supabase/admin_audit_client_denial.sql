-- Already applied after platform_admins.sql.
create policy no_client_access on laco_private.platform_admin_audit
 for all to authenticated using(false) with check(false);
