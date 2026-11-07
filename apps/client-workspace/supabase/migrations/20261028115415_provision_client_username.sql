begin;
create table workspace_private.client_login_provisions (
  operation_id uuid primary key,
  actor_id uuid not null references auth.users(id),
  client_id uuid not null references public.clients(id),
  username text not null unique check (username ~ '^[a-z][a-z0-9._-]{2,31}$'),
  user_id uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table workspace_private.client_login_provisions enable row level security;
revoke all on workspace_private.client_login_provisions from public, anon, authenticated;
grant select, insert, update on workspace_private.client_login_provisions to service_role;

create function public.reserve_client_login(p_operation uuid, p_actor uuid, p_client uuid, p_username text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare r workspace_private.client_login_provisions%rowtype;
begin
  if p_username !~ '^[a-z][a-z0-9._-]{2,31}$' then raise exception 'Invalid username'; end if;
  if exists (select 1 from workspace_private.login_usernames where username = p_username) then
    select * into r from workspace_private.client_login_provisions where operation_id = p_operation;
    if not found or r.actor_id != p_actor or r.client_id != p_client or r.username != p_username then
      raise exception 'Username unavailable';
    end if;
    return r.user_id is not null;
  end if;
  insert into workspace_private.client_login_provisions(operation_id,actor_id,client_id,username)
    values(p_operation,p_actor,p_client,p_username) on conflict (operation_id) do nothing;
  select * into r from workspace_private.client_login_provisions where operation_id = p_operation;
  if not found or r.actor_id != p_actor or r.client_id != p_client or r.username != p_username then
    raise exception 'Invalid request';
  end if;
  return r.user_id is not null;
end $$;

-- The owner needs the Auth metadata for one exact identity check. Execute is
-- server-only; no broad auth.users metadata grant is given to service_role.
create function public.finish_client_login(p_operation uuid, p_actor uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare r workspace_private.client_login_provisions%rowtype;
begin
  select * into r from workspace_private.client_login_provisions where operation_id = p_operation for update;
  if not found or r.actor_id != p_actor then raise exception 'Invalid request'; end if;
  if r.user_id is not null and r.user_id != p_user then raise exception 'Account mismatch'; end if;
  if not exists (select 1 from auth.users where id = p_user and email = p_operation::text || '@login.emberweb.invalid'
     and email_confirmed_at is not null and raw_app_meta_data->>'workspace_provisioning_id' = p_operation::text) then
    raise exception 'Account mismatch';
  end if;
  insert into workspace_private.login_usernames(username,auth_user_id) values(r.username,p_user)
    on conflict (username) do nothing;
  if not exists(select 1 from workspace_private.login_usernames where username=r.username and auth_user_id=p_user and enabled) then
    raise exception 'Username unavailable';
  end if;
  insert into public.client_portal_memberships(client_id,user_id,active) values(r.client_id,p_user,true)
    on conflict (client_id,user_id) do update set active=true;
  update workspace_private.client_login_provisions set user_id=p_user where operation_id=p_operation;
end $$;
revoke all on function public.reserve_client_login(uuid,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.finish_client_login(uuid,uuid,uuid) from public, anon, authenticated;
grant execute on function public.reserve_client_login(uuid,uuid,uuid,text) to service_role;
grant execute on function public.finish_client_login(uuid,uuid,uuid) to service_role;
commit;
