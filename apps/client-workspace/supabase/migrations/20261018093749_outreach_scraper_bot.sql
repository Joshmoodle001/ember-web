-- Additive private campaign bot. Apply after the archive/product migration.
begin;

create table public.outreach_bot_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  product_key text not null check (product_key in ('emberweb','biosync')),
  industry text not null default '' check (char_length(industry) <= 100),
  city text not null default '' check (char_length(city) <= 120),
  status text not null default 'active' check (status in ('active','paused','completed')),
  daily_limit integer not null check (daily_limit between 1 and 20),
  max_sites integer not null check (max_sites between 1 and 20),
  daily_run_date date,
  daily_run_count integer not null default 0 check (daily_run_count between 0 and 20),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index outreach_bot_campaign_status_idx on public.outreach_bot_campaigns(status, created_at);

create table public.outreach_bot_jobs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.outreach_bot_campaigns(id) on delete restrict,
  seed_kind text not null check (seed_kind in ('business','directory')),
  source_url text not null check (char_length(source_url) between 10 and 2048 and source_url ~ '^https://[a-z0-9.-]+/[^?#]*$'),
  canonical_host text not null check (char_length(canonical_host) between 4 and 253 and canonical_host ~ '^[a-z0-9.-]+$'),
  status text not null default 'queued' check (status in ('queued','running','completed','failed','skipped')),
  attempts integer not null default 0 check (attempts between 0 and 3),
  available_at timestamptz not null default now(),
  lease_token uuid,
  lease_expires_at timestamptz,
  result jsonb check (result is null or (jsonb_typeof(result) = 'object' and octet_length(result::text) <= 32000)),
  error_code text check (char_length(error_code) <= 80),
  prospect_id uuid references public.outreach_prospects(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz,
  unique(campaign_id, canonical_host),
  check ((status = 'running' and lease_token is not null and lease_expires_at is not null)
    or (status <> 'running' and lease_token is null and lease_expires_at is null)),
  check ((status = 'completed') = (result is not null)),
  check ((status in ('completed','failed','skipped')) = (finished_at is not null))
);
create index outreach_bot_claim_idx on public.outreach_bot_jobs(status, available_at, created_at);
create index outreach_bot_history_idx on public.outreach_bot_jobs(created_at desc);
create unique index outreach_bot_one_active_host on public.outreach_bot_jobs(canonical_host) where status in ('queued','running');

alter table public.outreach_bot_campaigns enable row level security;
alter table public.outreach_bot_jobs enable row level security;
revoke all on public.outreach_bot_campaigns, public.outreach_bot_jobs from public, anon, authenticated, service_role;
grant select on public.outreach_bot_campaigns, public.outreach_bot_jobs to authenticated;
create policy outreach_bot_campaign_admin_read on public.outreach_bot_campaigns for select to authenticated using (workspace_private.is_workspace_admin());
create policy outreach_bot_job_admin_read on public.outreach_bot_jobs for select to authenticated using (workspace_private.is_workspace_admin());
grant select, insert, update on public.outreach_bot_campaigns, public.outreach_bot_jobs to service_role;
grant select, insert on public.outreach_prospects to service_role;

-- Used only for identity comparisons, never for making network requests.
create function public.outreach_bot_hostname(p_url text) returns text
language sql immutable strict security invoker set search_path = '' as $$
  select regexp_replace(coalesce(substring(lower(p_url) from '^https?://([^/:?#]+)'), ''), '^www\.', '');
$$;
revoke all on function public.outreach_bot_hostname(text) from public, anon, authenticated;
grant execute on function public.outreach_bot_hostname(text) to service_role;

create function public.outreach_bot_source_suppressed(p_source_url text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.outreach_prospects p where p.permission_status='do_not_contact'
    and public.outreach_bot_hostname(p.website)=public.outreach_bot_hostname(p_source_url));
$$;
revoke all on function public.outreach_bot_source_suppressed(text) from public, anon, authenticated;
grant execute on function public.outreach_bot_source_suppressed(text) to service_role;

create function public.create_outreach_bot_campaign(
  p_name text, p_product_key text, p_industry text, p_city text,
  p_daily_limit integer, p_max_sites integer, p_sources jsonb, p_created_by uuid
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare campaign_id uuid; source jsonb; host text; business_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('emberweb_outreach_bot'));
  if (select count(*) from public.outreach_bot_campaigns where status='active') >= 10 then
    raise exception 'active campaign limit reached' using errcode='22023';
  end if;
  if jsonb_typeof(p_sources) is distinct from 'array' or jsonb_array_length(p_sources) not between 1 and 20 then
    raise exception 'invalid sources' using errcode='22023';
  end if;
  select count(*) into business_count from jsonb_array_elements(p_sources) s where s->>'kind'='business';
  if business_count > p_max_sites then raise exception 'source cap reached' using errcode='22023'; end if;
  insert into public.outreach_bot_campaigns(name,product_key,industry,city,daily_limit,max_sites,created_by)
    values(p_name,p_product_key,p_industry,p_city,p_daily_limit,p_max_sites,p_created_by) returning id into campaign_id;
  for source in select value from jsonb_array_elements(p_sources) loop
    if jsonb_typeof(source) is distinct from 'object' or source->>'kind' not in ('business','directory') or source->>'url' is null then
      raise exception 'invalid source' using errcode='22023';
    end if;
    host := public.outreach_bot_hostname(source->>'url');
    if host = '' or host not like '%.%' then raise exception 'invalid source host' using errcode='22023'; end if;
    insert into public.outreach_bot_jobs(campaign_id,seed_kind,source_url,canonical_host)
      values(campaign_id,source->>'kind',source->>'url',host);
  end loop;
  return campaign_id;
end;
$$;
revoke all on function public.create_outreach_bot_campaign(text,text,text,text,integer,integer,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.create_outreach_bot_campaign(text,text,text,text,integer,integer,jsonb,uuid) to service_role;

create function public.set_outreach_bot_campaign_status(p_id uuid, p_status text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare current_status text;
begin
  perform pg_advisory_xact_lock(hashtext('emberweb_outreach_bot'));
  if p_status not in ('active','paused') then raise exception 'invalid status' using errcode='22023'; end if;
  select status into current_status from public.outreach_bot_campaigns where id=p_id for update;
  if not found or current_status='completed' then return false; end if;
  if p_status='active' and current_status <> 'active' and (select count(*) from public.outreach_bot_campaigns where status='active') >= 10 then
    raise exception 'active campaign limit reached' using errcode='22023';
  end if;
  update public.outreach_bot_campaigns set status=p_status, updated_at=now() where id=p_id;
  if p_status='paused' then
    -- Invalidates every in-flight token. Pauses do not consume retry attempts;
    -- their already-started network work still consumes the daily budget.
    update public.outreach_bot_jobs set status='queued', attempts=greatest(attempts-1,0), lease_token=null, lease_expires_at=null,
      error_code='campaign_paused', available_at=now(), updated_at=now() where campaign_id=p_id and status='running';
  end if;
  return true;
end;
$$;
revoke all on function public.set_outreach_bot_campaign_status(uuid,text) from public, anon, authenticated;
grant execute on function public.set_outreach_bot_campaign_status(uuid,text) to service_role;

create function public.claim_outreach_bot_job()
returns setof public.outreach_bot_jobs language plpgsql security invoker set search_path = '' as $$
declare next_id uuid; next_campaign uuid; budget_day date := (now() at time zone 'Africa/Johannesburg')::date;
begin
  perform pg_advisory_xact_lock(hashtext('emberweb_outreach_bot'));
  update public.outreach_bot_jobs set status='failed', error_code='attempt_limit', lease_token=null, lease_expires_at=null,
    finished_at=now(), updated_at=now() where status='running' and lease_expires_at <= now() and attempts >= 3;
  update public.outreach_bot_campaigns c set status='completed', updated_at=now() where c.status='active'
    and not exists(select 1 from public.outreach_bot_jobs j where j.campaign_id=c.id and j.status in ('queued','running'));
  select j.id,j.campaign_id into next_id,next_campaign from public.outreach_bot_jobs j
    join public.outreach_bot_campaigns c on c.id=j.campaign_id
    where c.status='active' and j.available_at <= now() and j.attempts < 3
      and (j.status='queued' or (j.status='running' and j.lease_expires_at <= now()))
      and (c.daily_run_date is distinct from budget_day or c.daily_run_count < c.daily_limit)
    order by j.available_at,j.created_at,j.id for update of j,c skip locked limit 1;
  if next_id is null then return; end if;
  update public.outreach_bot_campaigns set daily_run_count=case when daily_run_date=budget_day then daily_run_count+1 else 1 end,
    daily_run_date=budget_day, updated_at=now() where id=next_campaign;
  return query update public.outreach_bot_jobs set status='running', attempts=attempts+1, lease_token=gen_random_uuid(),
    lease_expires_at=now()+interval '120 seconds', updated_at=now(), error_code=null, finished_at=null where id=next_id returning *;
end;
$$;
revoke all on function public.claim_outreach_bot_job() from public, anon, authenticated;
grant execute on function public.claim_outreach_bot_job() to service_role;

create function public.finish_outreach_bot_job(
  p_id uuid, p_lease_token uuid, p_status text, p_result jsonb, p_error_code text, p_discovered_urls jsonb default '[]'::jsonb
) returns text language plpgsql security invoker set search_path = '' as $$
declare job public.outreach_bot_jobs%rowtype; campaign public.outreach_bot_campaigns%rowtype;
  outcome text := p_status; candidate text; candidate_host text; sites integer;
begin
  perform pg_advisory_xact_lock(hashtext('emberweb_outreach_bot'));
  if p_status not in ('completed','failed','skipped') or (p_status='completed') is distinct from (p_result is not null)
    or (p_result is not null and (jsonb_typeof(p_result) <> 'object' or octet_length(p_result::text) > 32000))
    or jsonb_typeof(p_discovered_urls) is distinct from 'array' or jsonb_array_length(p_discovered_urls) > 20 then
    raise exception 'invalid completion' using errcode='22023';
  end if;
  select * into job from public.outreach_bot_jobs where id=p_id and status='running' and lease_token=p_lease_token and lease_expires_at>now() for update;
  if not found then return 'lost_lease'; end if;
  select * into campaign from public.outreach_bot_campaigns where id=job.campaign_id for update;
  if campaign.status <> 'active' then return 'lost_lease'; end if;
  if exists(select 1 from public.outreach_prospects p where p.permission_status='do_not_contact'
      and public.outreach_bot_hostname(p.website)=job.canonical_host) then
    outcome := 'skipped'; p_result := null; p_error_code := 'do_not_contact';
  elsif outcome='failed' and p_error_code in ('timeout','fetch_failed') and job.attempts < 3 then
    outcome := 'queued';
  end if;
  update public.outreach_bot_jobs set status=outcome, result=p_result, error_code=p_error_code, lease_token=null, lease_expires_at=null,
    available_at=case when outcome='queued' then now()+make_interval(secs=>job.attempts*300) else available_at end,
    finished_at=case when outcome='queued' then null else now() end, updated_at=now() where id=job.id;
  if outcome='completed' and job.seed_kind='directory' then
    select count(*) into sites from public.outreach_bot_jobs where campaign_id=campaign.id and seed_kind='business';
    for candidate in select value from jsonb_array_elements_text(p_discovered_urls) loop
      exit when sites >= campaign.max_sites;
      candidate_host := public.outreach_bot_hostname(candidate);
      if candidate !~ '^https://[a-z0-9.-]+/$' or candidate_host='' or candidate_host not like '%.%'
        or exists(select 1 from public.outreach_bot_jobs where campaign_id=campaign.id and canonical_host=candidate_host)
        or exists(select 1 from public.outreach_bot_jobs where canonical_host=candidate_host and status in ('queued','running'))
        or exists(select 1 from public.outreach_prospects p where p.permission_status='do_not_contact' and public.outreach_bot_hostname(p.website)=candidate_host) then continue; end if;
      insert into public.outreach_bot_jobs(campaign_id,seed_kind,source_url,canonical_host) values(campaign.id,'business',candidate,candidate_host);
      sites := sites+1;
    end loop;
  end if;
  update public.outreach_bot_campaigns c set status='completed',updated_at=now() where c.id=campaign.id
    and not exists(select 1 from public.outreach_bot_jobs j where j.campaign_id=c.id and j.status in ('queued','running'));
  return outcome;
end;
$$;
revoke all on function public.finish_outreach_bot_job(uuid,uuid,text,jsonb,text,jsonb) from public, anon, authenticated;
grant execute on function public.finish_outreach_bot_job(uuid,uuid,text,jsonb,text,jsonb) to service_role;

create function public.import_outreach_bot_result(p_job_id uuid)
returns table(prospect_id uuid, imported boolean) language plpgsql security invoker set search_path = '' as $$
declare job public.outreach_bot_jobs%rowtype; campaign public.outreach_bot_campaigns%rowtype;
  existing_id uuid; business_name text; observed_email text := ''; observed_phone text := ''; contact jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('emberweb_outreach_bot'));
  select * into job from public.outreach_bot_jobs where id=p_job_id for update;
  if not found or job.status <> 'completed' or job.seed_kind <> 'business' or job.result->>'kind' <> 'business' then
    raise exception 'result not ready' using errcode='22023';
  end if;
  if exists(select 1 from public.outreach_prospects p where p.permission_status='do_not_contact'
    and public.outreach_bot_hostname(p.website)=job.canonical_host) then
    raise exception 'contact suppressed' using errcode='22023';
  end if;
  select p.id into existing_id from public.outreach_prospects p where p.archived_at is null
    and public.outreach_bot_hostname(p.website)=job.canonical_host order by p.created_at,p.id limit 1;
  if existing_id is not null then
    update public.outreach_bot_jobs set prospect_id=existing_id,updated_at=now() where id=job.id;
    return query select existing_id,false; return;
  end if;
  select * into campaign from public.outreach_bot_campaigns where id=job.campaign_id;
  business_name := left(coalesce(nullif(trim(job.result#>>'{evidence,businessName}'),''),nullif(trim(job.result#>>'{evidence,title}'),''),job.canonical_host),180);
  if char_length(business_name) < 2 then business_name := job.canonical_host; end if;
  if jsonb_typeof(job.result#>'{evidence,contacts}')='array' then
    for contact in select value from jsonb_array_elements(job.result#>'{evidence,contacts}') loop
      if contact->>'kind'='email' and observed_email='' and char_length(contact->>'value') <= 254 and contact->>'value' ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then observed_email := lower(contact->>'value'); end if;
      if contact->>'kind'='phone' and observed_phone='' and char_length(contact->>'value') <= 60 then observed_phone := contact->>'value'; end if;
    end loop;
  end if;
  insert into public.outreach_prospects(business_name,industry,city,website,phone,email,notes,permission_status,permission_note,status,product_key)
    values(business_name,campaign.industry,campaign.city,job.source_url,observed_phone,observed_email,
      left('Reviewed website research from '||job.source_url||'. Public contact details are observed evidence only; delivery and contact permission are unverified. Research job: '||job.id::text,4000),
      'unconfirmed','','research',campaign.product_key) returning id into existing_id;
  update public.outreach_bot_jobs set prospect_id=existing_id,updated_at=now() where id=job.id;
  return query select existing_id,true;
end;
$$;
revoke all on function public.import_outreach_bot_result(uuid) from public, anon, authenticated;
grant execute on function public.import_outreach_bot_result(uuid) to service_role;
commit;
