-- Auth tables are not granted to the service Data API role. Keep the necessary
-- privileged lookups in a non-exposed schema behind service-only invoker wrappers.
begin;
alter function workspace_private.actor_role(uuid) security definer;
alter function public.workspace_identity(uuid) set schema workspace_private;
alter function workspace_private.workspace_identity(uuid) security definer;
alter function public.workspace_board(uuid) set schema workspace_private;
alter function workspace_private.workspace_board(uuid) security definer;
alter function public.workspace_super_report(uuid,bigint) set schema workspace_private;
alter function workspace_private.workspace_super_report(uuid,bigint) security definer;
alter function public.workspace_super_accounts(uuid,integer) set schema workspace_private;
alter function workspace_private.workspace_super_accounts(uuid,integer) security definer;
alter function public.workspace_account_access(uuid,uuid,text,text,uuid) set schema workspace_private;
alter function workspace_private.workspace_account_access(uuid,uuid,text,text,uuid) security definer;
alter function public.list_client_requests(uuid,boolean) set schema workspace_private;
alter function workspace_private.list_client_requests(uuid,boolean) security definer;
alter function public.mutate_client_request(uuid,boolean,text,jsonb) set schema workspace_private;
alter function workspace_private.mutate_client_request(uuid,boolean,text,jsonb) security definer;

create function public.workspace_identity(p_actor_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$ select workspace_private.workspace_identity(p_actor_id) $$;
create function public.workspace_board(p_actor_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$ select workspace_private.workspace_board(p_actor_id) $$;
create function public.workspace_super_report(p_actor_id uuid,p_before bigint default null) returns jsonb language sql stable security invoker set search_path='' as $$ select workspace_private.workspace_super_report(p_actor_id,p_before) $$;
create function public.workspace_super_accounts(p_actor_id uuid,p_page integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$ select workspace_private.workspace_super_accounts(p_actor_id,p_page) $$;
create function public.workspace_account_access(p_actor_id uuid,p_target_id uuid,p_action text,p_role text default null,p_client_id uuid default null) returns void language sql security invoker set search_path='' as $$ select workspace_private.workspace_account_access(p_actor_id,p_target_id,p_action,p_role,p_client_id) $$;
create function public.list_client_requests(p_actor_id uuid,p_staff boolean default false) returns jsonb language sql stable security invoker set search_path='' as $$ select workspace_private.list_client_requests(p_actor_id,p_staff) $$;
create function public.mutate_client_request(p_actor_id uuid,p_staff boolean,p_action text,p_payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
begin
 perform set_config('workspace.actor_id',p_actor_id::text,true);
 perform set_config('workspace.actor_kind',case when p_staff then 'staff' else 'client' end,true);
 return workspace_private.mutate_client_request(p_actor_id,p_staff,p_action,p_payload);
end $$;
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','workspace_private') and p.proname in ('workspace_identity','workspace_board','workspace_super_report','workspace_super_accounts','workspace_account_access','list_client_requests','mutate_client_request') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
