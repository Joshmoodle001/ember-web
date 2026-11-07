begin;

alter table public.inquiries
  add column submission_id uuid,
  add constraint inquiries_submission_id_key unique (submission_id);

create table workspace_private.staff_email_outbox (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null unique references public.inquiries(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts between 0 and 1000),
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  provider_message_id text check (provider_message_id is null or char_length(provider_message_id) <= 200),
  last_error_code text check (last_error_code is null or last_error_code in (
    'configuration_missing',
    'provider_rate_limited',
    'provider_unavailable',
    'provider_rejected',
    'provider_timeout',
    'provider_network_error',
    'provider_invalid_response'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  check (
    (status = 'sending' and lease_token is not null and lease_expires_at is not null)
    or (status <> 'sending' and lease_token is null and lease_expires_at is null)
  )
);
create index staff_email_outbox_pending_idx
  on workspace_private.staff_email_outbox (next_attempt_at, created_at)
  where status in ('pending', 'failed');

alter table workspace_private.staff_email_outbox enable row level security;
revoke all on workspace_private.staff_email_outbox from public, anon, authenticated, service_role;
grant select, insert, update on workspace_private.staff_email_outbox to service_role;
grant select on public.inquiries to service_role;

create or replace function workspace_private.enqueue_staff_email_outbox()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_schema <> 'public' or tg_table_name <> 'inquiries' or tg_op <> 'INSERT' then
    raise exception 'invalid staff email outbox trigger context';
  end if;
  insert into workspace_private.staff_email_outbox (inquiry_id)
  values (new.id)
  on conflict (inquiry_id) do nothing;
  return new;
end;
$$;
revoke all on function workspace_private.enqueue_staff_email_outbox() from public, anon;
grant execute on function workspace_private.enqueue_staff_email_outbox() to authenticated, service_role;

create trigger inquiries_enqueue_staff_email_outbox
after insert on public.inquiries
for each row execute function workspace_private.enqueue_staff_email_outbox();

create or replace function public.claim_staff_email_for_delivery(
  p_outbox_id uuid,
  p_lease_seconds integer default 90
)
returns table (outbox_id uuid, inquiry_id uuid, lease_token uuid, attempts integer)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_outbox_id is null or p_lease_seconds is null or p_lease_seconds < 15 or p_lease_seconds > 600 then
    raise exception 'invalid staff email claim input' using errcode = '22023';
  end if;
  return query
  with claimed as (
    update workspace_private.staff_email_outbox o
    set status = 'sending',
        attempts = o.attempts + 1,
        next_attempt_at = now(),
        lease_token = gen_random_uuid(),
        lease_expires_at = now() + make_interval(secs => p_lease_seconds),
        last_error_code = null,
        updated_at = now()
    where o.id = p_outbox_id
      and o.status = 'pending'
      and o.next_attempt_at <= now()
    returning o.id, o.inquiry_id, o.lease_token, o.attempts
  )
  select c.id, c.inquiry_id, c.lease_token, c.attempts
  from claimed c;
end;
$$;
revoke all on function public.claim_staff_email_for_delivery(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_staff_email_for_delivery(uuid, integer) to service_role;

create or replace function public.find_staff_email_outbox_id(p_inquiry_id uuid)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select id
  from workspace_private.staff_email_outbox
  where inquiry_id = p_inquiry_id;
$$;
revoke all on function public.find_staff_email_outbox_id(uuid) from public, anon, authenticated;
grant execute on function public.find_staff_email_outbox_id(uuid) to service_role;

create or replace function public.claim_staff_email_for_retry(
  p_outbox_id uuid,
  p_lease_seconds integer default 90
)
returns table (
  outbox_id uuid,
  inquiry_id uuid,
  lease_token uuid,
  attempts integer,
  name text,
  company text,
  email text,
  phone text,
  service text,
  budget text,
  brief text
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_outbox_id is null or p_lease_seconds is null or p_lease_seconds < 15 or p_lease_seconds > 600 then
    raise exception 'invalid staff email retry input' using errcode = '22023';
  end if;
  return query
  with claimed as (
    update workspace_private.staff_email_outbox o
    set status = 'sending',
        attempts = o.attempts + 1,
        next_attempt_at = now(),
        lease_token = gen_random_uuid(),
        lease_expires_at = now() + make_interval(secs => p_lease_seconds),
        last_error_code = null,
        updated_at = now()
    where o.id = p_outbox_id
      and (
        o.status in ('pending', 'failed')
        or (o.status = 'sending' and o.lease_expires_at <= now())
      )
    returning o.id, o.inquiry_id, o.lease_token, o.attempts
  )
  select c.id, c.inquiry_id, c.lease_token, c.attempts,
         i.name, i.company, i.email, i.phone, i.service, i.budget, i.brief
  from claimed c
  join public.inquiries i on i.id = c.inquiry_id;
end;
$$;
revoke all on function public.claim_staff_email_for_retry(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_staff_email_for_retry(uuid, integer) to service_role;

create or replace function public.mark_staff_email_configuration_missing(p_outbox_id uuid)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update workspace_private.staff_email_outbox
  set last_error_code = 'configuration_missing', updated_at = now()
  where id = p_outbox_id and status = 'pending';
  return found;
end;
$$;
revoke all on function public.mark_staff_email_configuration_missing(uuid) from public, anon, authenticated;
grant execute on function public.mark_staff_email_configuration_missing(uuid) to service_role;

create or replace function public.complete_staff_email_delivery(
  p_outbox_id uuid,
  p_lease_token uuid,
  p_provider_message_id text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_outbox_id is null or p_lease_token is null
    or p_provider_message_id is null
    or char_length(p_provider_message_id) not between 1 and 200 then
    raise exception 'invalid staff email completion input' using errcode = '22023';
  end if;
  update workspace_private.staff_email_outbox
  set status = 'sent',
      provider_message_id = p_provider_message_id,
      lease_token = null,
      lease_expires_at = null,
      last_error_code = null,
      sent_at = now(),
      updated_at = now()
  where id = p_outbox_id and status = 'sending' and lease_token = p_lease_token;
  return found;
end;
$$;
revoke all on function public.complete_staff_email_delivery(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.complete_staff_email_delivery(uuid, uuid, text) to service_role;

create or replace function public.fail_staff_email_delivery(
  p_outbox_id uuid,
  p_lease_token uuid,
  p_error_code text,
  p_retryable boolean
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  retry_after_seconds integer;
begin
  if p_outbox_id is null or p_lease_token is null or p_retryable is null or p_error_code is null
    or p_error_code not in (
      'provider_rate_limited',
      'provider_unavailable',
      'provider_rejected',
      'provider_timeout',
      'provider_network_error',
      'provider_invalid_response'
    ) then
    raise exception 'invalid staff email failure input' using errcode = '22023';
  end if;
  retry_after_seconds := least(3600, 30 * power(2::numeric, least(7, coalesce((
    select attempts from workspace_private.staff_email_outbox
    where id = p_outbox_id and lease_token = p_lease_token
  ), 0)))::integer);
  update workspace_private.staff_email_outbox
  set status = case when p_retryable then 'pending' else 'failed' end,
      next_attempt_at = now() + make_interval(secs => retry_after_seconds),
      lease_token = null,
      lease_expires_at = null,
      last_error_code = p_error_code,
      updated_at = now()
  where id = p_outbox_id and status = 'sending' and lease_token = p_lease_token;
  return found;
end;
$$;
revoke all on function public.fail_staff_email_delivery(uuid, uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.fail_staff_email_delivery(uuid, uuid, text, boolean) to service_role;

create or replace function public.list_staff_email_notifications()
returns table (
  outbox_id uuid,
  inquiry_id uuid,
  inquiry_name text,
  inquiry_email text,
  status text,
  attempts integer,
  next_attempt_at timestamptz,
  lease_expires_at timestamptz,
  last_error_code text,
  created_at timestamptz,
  sent_at timestamptz
)
language sql
security invoker
set search_path = ''
as $$
  select o.id, o.inquiry_id, i.name, i.email, o.status, o.attempts,
         o.next_attempt_at, o.lease_expires_at, o.last_error_code, o.created_at, o.sent_at
  from workspace_private.staff_email_outbox o
  join public.inquiries i on i.id = o.inquiry_id
  order by o.created_at desc
  limit 100;
$$;
revoke all on function public.list_staff_email_notifications() from public, anon, authenticated;
grant execute on function public.list_staff_email_notifications() to service_role;

commit;
