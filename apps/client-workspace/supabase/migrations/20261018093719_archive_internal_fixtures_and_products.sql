-- Add reversible archival for internal verification records. No customer rows are
-- archived by this schema migration; a separate exact-ID reviewed operation does that.
-- Apply only to hbdxhbwufgkrwqxpieds.
begin;

alter table public.inquiries add column if not exists archived_at timestamptz;
alter table public.clients add column if not exists archived_at timestamptz;
alter table public.invoices add column if not exists archived_at timestamptz;
alter table public.outreach_prospects add column if not exists archived_at timestamptz;
alter table public.website_research_jobs add column if not exists archived_at timestamptz;

alter table public.outreach_prospects
  add column if not exists product_key text not null default 'emberweb'
    check (product_key in ('emberweb', 'biosync'));

-- Restrictive policies combine with existing admin policies. Archived records stay
-- stored with their financial links and can be restored by clearing archived_at.
create policy inquiries_live_records on public.inquiries as restrictive
  for all to authenticated using (archived_at is null) with check (archived_at is null);
create policy clients_live_records on public.clients as restrictive
  for all to authenticated using (archived_at is null) with check (archived_at is null);
create policy invoices_live_records on public.invoices as restrictive
  for all to authenticated using (archived_at is null) with check (archived_at is null);
create policy outreach_live_records on public.outreach_prospects as restrictive
  for all to authenticated using (archived_at is null) with check (archived_at is null);
create policy website_research_live_records on public.website_research_jobs as restrictive
  for select to authenticated using (archived_at is null);

comment on column public.outreach_prospects.product_key is
  'Offer being discussed. Product details are versioned in the EmberWeb product catalog; no BioSync customer data is connected.';
comment on column public.invoices.archived_at is
  'Reversible removal from staff screens. Does not delete the invoice or payment history.';

create or replace function public.claim_website_research()
returns setof public.website_research_jobs language plpgsql security invoker set search_path = '' as $$
declare next_id uuid;
begin
  update public.website_research_jobs set status='failed', error_code='attempt_limit', lease_token=null, lease_expires_at=null, finished_at=now(), updated_at=now()
    where archived_at is null and status='running' and lease_expires_at <= now() and attempts >= 3;
  select id into next_id from public.website_research_jobs
    where archived_at is null and (status='queued' or (status='running' and lease_expires_at <= now())) and attempts < 3
    order by created_at for update skip locked limit 1;
  if next_id is null then return; end if;
  return query update public.website_research_jobs set status='running', attempts=attempts+1, lease_token=gen_random_uuid(), lease_expires_at=now()+interval '120 seconds', updated_at=now(), finished_at=null, error_code=null
    where id=next_id returning *;
end;
$$;
revoke all on function public.claim_website_research() from public, anon, authenticated;
grant execute on function public.claim_website_research() to service_role;

commit;
