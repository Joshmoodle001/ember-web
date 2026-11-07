begin;
create table public.website_research_jobs (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.outreach_prospects(id) on delete cascade,
  business_name text not null check (char_length(business_name) between 2 and 180),
  source_url text not null check (char_length(source_url) between 10 and 2048),
  source_updated_at timestamptz not null,
  status text not null default 'queued' check (status in ('queued','running','completed','failed','skipped')),
  attempts integer not null default 0 check (attempts between 0 and 3),
  lease_token uuid,
  lease_expires_at timestamptz,
  result jsonb check (result is null or (jsonb_typeof(result) = 'object' and octet_length(result::text) <= 16000)),
  error_code text check (char_length(error_code) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  check ((status = 'running' and lease_token is not null and lease_expires_at is not null)
    or (status <> 'running' and lease_token is null and lease_expires_at is null)),
  check ((status = 'completed') = (result is not null)),
  check ((status in ('completed','failed','skipped')) = (finished_at is not null))
);
create unique index website_research_one_active_prospect on public.website_research_jobs(prospect_id) where status in ('queued','running');
create index website_research_claim_idx on public.website_research_jobs(status, created_at);
create index website_research_history_idx on public.website_research_jobs(created_at desc);
alter table public.website_research_jobs enable row level security;
revoke all on public.website_research_jobs from public, anon, authenticated;
grant select on public.website_research_jobs to authenticated;
create policy website_research_admin_read on public.website_research_jobs for select to authenticated using (workspace_private.is_workspace_admin());
revoke all on public.website_research_jobs from service_role;
grant select, insert, update on public.website_research_jobs to service_role;
create function public.claim_website_research()
returns setof public.website_research_jobs language plpgsql security invoker set search_path = '' as $$
declare next_id uuid;
begin
  update public.website_research_jobs set status='failed', error_code='attempt_limit', lease_token=null, lease_expires_at=null, finished_at=now(), updated_at=now()
    where status='running' and lease_expires_at <= now() and attempts >= 3;
  select id into next_id from public.website_research_jobs
    where (status='queued' or (status='running' and lease_expires_at <= now())) and attempts < 3
    order by created_at for update skip locked limit 1;
  if next_id is null then return; end if;
  return query update public.website_research_jobs set status='running', attempts=attempts+1, lease_token=gen_random_uuid(), lease_expires_at=now()+interval '120 seconds', updated_at=now(), finished_at=null, error_code=null
    where id=next_id returning *;
end;
$$;
revoke all on function public.claim_website_research() from public, anon, authenticated;
grant execute on function public.claim_website_research() to service_role;
commit;
