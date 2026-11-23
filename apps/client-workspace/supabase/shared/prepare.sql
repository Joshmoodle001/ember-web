begin;

create schema emberweb;
create schema emberweb_private;
revoke all on schema emberweb, emberweb_private from public;
create role emberweb_member nologin noinherit;
grant emberweb_member to authenticator;
grant usage on schema emberweb to emberweb_member, service_role;
alter default privileges in schema emberweb grant select, insert, update, delete on tables to service_role;

create function emberweb_private.request_uid() returns uuid
language sql stable set search_path = '' as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
$$;

create function emberweb_private.request_email() returns text
language sql stable set search_path = '' as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb -> 'app_metadata' ->> 'emberweb_email';
$$;

create view emberweb_private.account_users with (security_barrier = true) as
select id, email as auth_email, coalesce(lower(raw_app_meta_data ->> 'emberweb_email'), email) as email,
       email_confirmed_at, raw_app_meta_data, raw_user_meta_data, deleted_at, banned_until, created_at, last_sign_in_at
from auth.users
where raw_app_meta_data ->> 'emberweb_workspace_id' = 'c5a1014d-1a15-4f29-acac-c7221799bdd3'
  and role = 'emberweb_member' and email like '%@login.emberweb.invalid';

create function emberweb.workspace_auth_account(p_email text default null, p_id uuid default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', id, 'email', email, 'authEmail', auth_email,
                            'verified', email_confirmed_at is not null)
  from emberweb_private.account_users
  where deleted_at is null and (p_id = id or (p_id is null and lower(p_email) = auth_email))
  limit 1;
$$;

revoke all on function emberweb.workspace_auth_account(text, uuid) from public;
grant execute on function emberweb.workspace_auth_account(text, uuid) to service_role;
