-- Archived inquiries must not appear in the staff email queue or consume delivery attempts.
-- Exact existing RPC signatures, INVOKER security and service-only grants are retained.
begin;

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
      and exists (
        select 1 from public.inquiries i
        where i.id = o.inquiry_id and i.archived_at is null
      )
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
      and exists (
        select 1 from public.inquiries i
        where i.id = o.inquiry_id and i.archived_at is null
      )
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
  where i.archived_at is null
  order by o.created_at desc
  limit 100;
$$;
revoke all on function public.list_staff_email_notifications() from public, anon, authenticated;
grant execute on function public.list_staff_email_notifications() to service_role;

commit;
