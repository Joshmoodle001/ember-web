begin;
create function workspace_private.is_workspace_super_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and workspace_private.actor_role(auth.uid())='super_admin';
$$;
revoke all on function workspace_private.is_workspace_super_admin() from public,anon;
grant execute on function workspace_private.is_workspace_super_admin() to authenticated,service_role;
alter policy membership_admin on public.client_portal_memberships to authenticated using(workspace_private.is_workspace_super_admin()) with check(workspace_private.is_workspace_super_admin());
-- Delivery changes and reassignment go through the versioned, audited command API.
revoke update,delete on public.projects from authenticated;
notify pgrst,'reload schema';
commit;
