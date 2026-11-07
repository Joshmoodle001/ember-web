create or replace function public.reserve_payfast_attempt(
  p_token_hash text,
  p_attempt_id uuid,
  p_expires_in_seconds integer default 1200
)
returns table (
  attempt_id uuid,
  invoice_id uuid,
  invoice_number text,
  description text,
  amount_cents integer,
  currency text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  invoice_row public.invoices%rowtype;
  active_attempt_id uuid;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_attempt_id is null
    or p_expires_in_seconds is null or p_expires_in_seconds < 60 or p_expires_in_seconds > 3600 then
    raise exception 'invalid payment attempt input' using errcode = '22023';
  end if;

  select i.* into invoice_row
  from public.invoices i
  where i.share_token_hash = p_token_hash
    and i.status in ('sent', 'overdue')
    and i.currency = 'ZAR'
  for update;
  if not found then return; end if;

  if exists (
    select 1 from public.payments p
    where p.invoice_id = invoice_row.id and p.status = 'complete' and p.duplicate_of is null
  ) then
    return;
  end if;

  update workspace_private.payment_attempts as a
  set status = 'expired', updated_at = now()
  where a.invoice_id = invoice_row.id and a.status = 'active' and a.expires_at <= now();
  select a.id into active_attempt_id
  from workspace_private.payment_attempts a
  where a.invoice_id = invoice_row.id and a.status = 'active'
  for update;
  if active_attempt_id is not null then
    return query select active_attempt_id, invoice_row.id, invoice_row.invoice_number,
      invoice_row.description, invoice_row.amount_cents, invoice_row.currency;
    return;
  end if;

  insert into workspace_private.payment_attempts(id, invoice_id, status, expires_at)
  values (p_attempt_id, invoice_row.id, 'active', now() + make_interval(secs => p_expires_in_seconds));

  return query select p_attempt_id, invoice_row.id, invoice_row.invoice_number,
    invoice_row.description, invoice_row.amount_cents, invoice_row.currency;
end;
$$;
revoke all on function public.reserve_payfast_attempt(text, uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_payfast_attempt(text, uuid, integer) to service_role;
