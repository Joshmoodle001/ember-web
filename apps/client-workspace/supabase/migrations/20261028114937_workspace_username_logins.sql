begin;

-- Internal aliases identify an existing Auth user. They contain no passwords,
-- client memberships or roles, and cannot be read/changed by browser sessions.
create table workspace_private.login_usernames (
  username text primary key check (username ~ '^[a-z][a-z0-9._-]{2,31}$'),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
alter table workspace_private.login_usernames enable row level security;
revoke all on workspace_private.login_usernames from public, anon, authenticated;
grant usage on schema workspace_private to service_role;
grant select, insert, update, delete on workspace_private.login_usernames to service_role;

-- The private schema stays unexposed. This minimal invoker RPC is callable only
-- by the server's service role, after the login route has consumed its limits.
create function public.resolve_workspace_login_username(p_username text)
returns uuid
language sql stable security invoker set search_path = ''
as $$
  select u.auth_user_id
  from workspace_private.login_usernames u
  where u.username = p_username and u.enabled;
$$;
revoke all on function public.resolve_workspace_login_username(text) from public, anon, authenticated;
grant execute on function public.resolve_workspace_login_username(text) to service_role;

comment on table workspace_private.login_usernames is
  'Server-only login aliases. Provision only after verifying the existing confirmed Auth user and intended access. Alias names grant no roles.';

commit;
