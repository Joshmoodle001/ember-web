-- EmberWeb client workspace: isolated from the legacy root migrations.
-- Apply only to Supabase project hbdxhbwufgkrwqxpieds.

begin;

create schema if not exists workspace_private;
revoke all on schema workspace_private from public, anon, authenticated;
grant usage on schema workspace_private to authenticated, service_role;

create table public.workspace_admins (
  email text primary key check (email = lower(email)),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.workspace_admins enable row level security;
revoke all on public.workspace_admins from public, anon, authenticated;

insert into public.workspace_admins (email)
values ('joshmoodley01@gmail.com')
on conflict (email) do update set active = true;

create or replace function workspace_private.is_workspace_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_admins a
    where a.active
      and a.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function workspace_private.is_workspace_admin() from public, anon;
grant execute on function workspace_private.is_workspace_admin() to authenticated, service_role;

create table workspace_private.rate_limits (
  key_hash text primary key check (key_hash ~ '^[a-f0-9]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  updated_at timestamptz not null default now()
);
create index rate_limits_window_started_idx on workspace_private.rate_limits (window_started_at);
alter table workspace_private.rate_limits enable row level security;
revoke all on workspace_private.rate_limits from public, anon, authenticated, service_role;
grant select, insert, update, delete on workspace_private.rate_limits to service_role;

create or replace function public.consume_workspace_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  active_window timestamptz;
  current_count integer;
begin
  if p_key_hash is null or p_key_hash !~ '^[a-f0-9]{64}$'
    or p_limit is null or p_limit < 1 or p_limit > 1000
    or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit input' using errcode = '22023';
  end if;
  active_window := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into workspace_private.rate_limits(key_hash, window_started_at, request_count, updated_at)
  values (p_key_hash, active_window, 1, now())
  on conflict (key_hash) do update
    set window_started_at = case
          when workspace_private.rate_limits.window_started_at < excluded.window_started_at then excluded.window_started_at
          else workspace_private.rate_limits.window_started_at
        end,
        request_count = case
          when workspace_private.rate_limits.window_started_at < excluded.window_started_at then 1
          else workspace_private.rate_limits.request_count + 1
        end,
        updated_at = now()
  returning request_count into current_count;
  if random() < 0.01 then
    delete from workspace_private.rate_limits
    where window_started_at < now() - interval '30 days';
  end if;
  return current_count <= p_limit;
end;
$$;
revoke all on function public.consume_workspace_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_workspace_rate_limit(text, integer, integer) to service_role;

create table public.inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  company text check (company is null or char_length(company) <= 160),
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or char_length(phone) <= 40),
  service text not null check (service in ('web_design', 'ai_development', 'web_and_ai', 'other')),
  budget text check (budget is null or budget in ('under_10000', '10000_30000', '30000_75000', '75000_plus', 'not_sure')),
  brief text not null check (char_length(trim(brief)) between 20 and 5000),
  stage text not null default 'new' check (stage in ('new', 'discovery', 'qualified', 'proposal', 'won', 'active', 'delivered', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index inquiries_stage_created_idx on public.inquiries (stage, created_at desc);
alter table public.inquiries enable row level security;
revoke all on public.inquiries from public, anon, authenticated;
grant select, insert, update, delete on public.inquiries to authenticated;
create policy inquiries_admin_all on public.inquiries
  for all to authenticated
  using (workspace_private.is_workspace_admin())
  with check (workspace_private.is_workspace_admin());

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid unique references public.inquiries(id) on delete set null,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  company text,
  email text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index clients_email_idx on public.clients (lower(email));
alter table public.clients enable row level security;
revoke all on public.clients from public, anon, authenticated;
grant select, insert, update, delete on public.clients to authenticated;
create policy clients_admin_all on public.clients
  for all to authenticated
  using (workspace_private.is_workspace_admin())
  with check (workspace_private.is_workspace_admin());

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  title text not null check (char_length(trim(title)) between 2 and 180),
  summary text not null default '',
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'review', 'delivered', 'on_hold')),
  progress integer not null default 0 check (progress between 0 and 100),
  due_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_client_created_idx on public.projects (client_id, created_at desc);
alter table public.projects enable row level security;
revoke all on public.projects from public, anon, authenticated;
grant select, insert, update, delete on public.projects to authenticated;
create policy projects_admin_all on public.projects
  for all to authenticated
  using (workspace_private.is_workspace_admin())
  with check (workspace_private.is_workspace_admin());

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.inquiries(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  starts_at timestamptz,
  booking_url text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  check (inquiry_id is not null or client_id is not null)
);
create index meetings_starts_at_idx on public.meetings (starts_at);
alter table public.meetings enable row level security;
revoke all on public.meetings from public, anon, authenticated;
grant select, insert, update, delete on public.meetings to authenticated;
create policy meetings_admin_all on public.meetings
  for all to authenticated
  using (workspace_private.is_workspace_admin())
  with check (workspace_private.is_workspace_admin());

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid references public.inquiries(id) on delete set null,
  client_id uuid references public.clients(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 180),
  summary text not null default '',
  proposal_url text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),
  version integer not null default 1 check (version > 0),
  share_token_hash text unique,
  share_token_expires_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (inquiry_id is not null or client_id is not null)
);
create index proposals_inquiry_created_idx on public.proposals (inquiry_id, created_at desc);
create unique index proposals_inquiry_version_idx on public.proposals (inquiry_id, version) where inquiry_id is not null;
create unique index proposals_client_version_idx on public.proposals (client_id, version) where client_id is not null;
alter table public.proposals enable row level security;
revoke all on public.proposals from public, anon, authenticated;
grant select, insert, update, delete on public.proposals to authenticated;
create policy proposals_admin_all on public.proposals
  for all to authenticated
  using (workspace_private.is_workspace_admin())
  with check (workspace_private.is_workspace_admin());

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  proposal_id uuid references public.proposals(id) on delete set null,
  invoice_number text not null unique,
  description text not null check (char_length(trim(description)) between 2 and 1000),
  amount_cents integer not null check (amount_cents >= 500),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'overdue', 'void')),
  due_on date,
  share_token_hash text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invoices_client_created_idx on public.invoices (client_id, created_at desc);
alter table public.invoices enable row level security;
revoke all on public.invoices from public, anon, authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
create policy invoices_admin_all on public.invoices
  for all to authenticated
  using (workspace_private.is_workspace_admin())
  with check (workspace_private.is_workspace_admin());

create or replace function public.get_invoice_for_payment(p_token_hash text)
returns table (
  invoice_id uuid,
  invoice_number text,
  client_label text,
  description text,
  amount_cents integer,
  currency text,
  status text,
  due_on date
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, i.invoice_number, coalesce(nullif(c.company, ''), c.full_name),
         i.description, i.amount_cents, i.currency, i.status, i.due_on
  from public.invoices i
  join public.clients c on c.id = i.client_id
  where i.share_token_hash = p_token_hash
    and i.status in ('sent', 'paid', 'overdue')
  limit 1;
$$;
revoke all on function public.get_invoice_for_payment(text) from public;
grant execute on function public.get_invoice_for_payment(text) to anon, authenticated;

create table workspace_private.payment_attempts (
  id uuid primary key,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'complete', 'failed', 'cancelled', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index payment_attempts_one_active_per_invoice_idx
  on workspace_private.payment_attempts (invoice_id)
  where status = 'active';
alter table workspace_private.payment_attempts enable row level security;
revoke all on workspace_private.payment_attempts from public, anon, authenticated, service_role;
grant select, insert, update on workspace_private.payment_attempts to service_role;

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

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete restrict,
  attempt_id uuid not null references workspace_private.payment_attempts(id) on delete restrict,
  provider text not null check (provider = 'payfast'),
  provider_reference text not null unique,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  status text not null check (status in ('pending', 'complete', 'failed', 'cancelled')),
  duplicate_of uuid references public.payments(id) on delete restrict,
  notify_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_invoice_created_idx on public.payments (invoice_id, created_at desc);
create unique index payments_one_primary_complete_per_invoice_idx
  on public.payments (invoice_id)
  where status = 'complete' and duplicate_of is null;
alter table public.payments enable row level security;
revoke all on public.payments from public, anon, authenticated;
grant select, insert, update, delete on public.payments to authenticated;
create policy payments_admin_all on public.payments
  for all to authenticated
  using (workspace_private.is_workspace_admin())
  with check (workspace_private.is_workspace_admin());

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 180),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done')),
  position integer not null default 0,
  due_on date,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index milestones_project_position_idx on public.milestones (project_id, position);
alter table public.milestones enable row level security;
revoke all on public.milestones from public, anon, authenticated;
grant select, insert, update, delete on public.milestones to authenticated;
create policy milestones_admin_all on public.milestones
  for all to authenticated
  using (workspace_private.is_workspace_admin())
  with check (workspace_private.is_workspace_admin());

create table public.workflow_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('inquiry', 'proposal', 'invoice', 'project', 'milestone', 'payment')),
  entity_id uuid not null,
  action text not null check (char_length(action) between 2 and 120),
  from_state text,
  to_state text,
  actor_email text,
  created_at timestamptz not null default now()
);
create index workflow_events_entity_created_idx on public.workflow_events (entity_type, entity_id, created_at desc);
alter table public.workflow_events enable row level security;
revoke all on public.workflow_events from public, anon, authenticated;
grant select, insert on public.workflow_events to authenticated;
create policy workflow_events_admin_select on public.workflow_events
  for select to authenticated
  using (workspace_private.is_workspace_admin());
create policy workflow_events_admin_insert on public.workflow_events
  for insert to authenticated
  with check (workspace_private.is_workspace_admin());

create or replace function public.transition_inquiry(p_inquiry_id uuid, p_stage text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_stage text;
begin
  if not workspace_private.is_workspace_admin() then
    raise exception 'workspace admin access required' using errcode = '42501';
  end if;
  if p_stage not in ('new', 'discovery', 'qualified', 'proposal', 'won', 'active', 'delivered', 'closed') then
    raise exception 'invalid inquiry stage' using errcode = '22023';
  end if;
  select i.stage into old_stage from public.inquiries i where i.id = p_inquiry_id;
  if old_stage is null then
    return false;
  end if;
  if old_stage = p_stage then
    return true;
  end if;
  update public.inquiries set stage = p_stage, updated_at = now() where id = p_inquiry_id;
  insert into public.workflow_events(entity_type, entity_id, action, from_state, to_state, actor_email)
  values ('inquiry', p_inquiry_id, 'stage_changed', old_stage, p_stage, lower(auth.jwt() ->> 'email'));
  return true;
end;
$$;
revoke all on function public.transition_inquiry(uuid, text) from public, anon;
grant execute on function public.transition_inquiry(uuid, text) to authenticated;

create or replace function public.transition_proposal(p_proposal_id uuid, p_status text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  old_status text;
  linked_inquiry uuid;
  old_stage text;
  next_stage text;
begin
  if not workspace_private.is_workspace_admin() then
    raise exception 'workspace admin access required' using errcode = '42501';
  end if;
  if p_status not in ('draft', 'sent', 'declined', 'expired') then
    raise exception 'invalid proposal status' using errcode = '22023';
  end if;
  select status, inquiry_id into old_status, linked_inquiry
  from public.proposals where id = p_proposal_id for update;
  if old_status is null then return false; end if;
  if old_status = p_status then return true; end if;
  if not (
    (old_status = 'sent' and p_status in ('declined', 'expired'))
  ) then
    raise exception 'invalid proposal status transition' using errcode = '22023';
  end if;
  update public.proposals
  set status = p_status,
      sent_at = case when p_status = 'sent' then coalesce(sent_at, now()) else sent_at end,
      share_token_hash = case when p_status in ('declined', 'expired') then null else share_token_hash end,
      share_token_expires_at = case when p_status in ('declined', 'expired') then null else share_token_expires_at end,
      updated_at = now()
  where id = p_proposal_id;
  insert into public.workflow_events(entity_type, entity_id, action, from_state, to_state, actor_email)
  values ('proposal', p_proposal_id, 'status_changed', old_status, p_status, lower(auth.jwt() ->> 'email'));
  if linked_inquiry is not null and p_status in ('sent', 'accepted') then
    select stage into old_stage from public.inquiries where id = linked_inquiry for update;
    if p_status = 'accepted' and old_stage = 'proposal' then next_stage := 'won';
    elsif p_status = 'sent' and old_stage in ('new', 'discovery', 'qualified') then next_stage := 'proposal';
    else next_stage := null;
    end if;
    if next_stage is not null then
      update public.inquiries set stage = next_stage, updated_at = now() where id = linked_inquiry;
      insert into public.workflow_events(entity_type, entity_id, action, from_state, to_state, actor_email)
      values ('inquiry', linked_inquiry, 'proposal_status_changed', old_stage, next_stage, lower(auth.jwt() ->> 'email'));
    end if;
  end if;
  return true;
end;
$$;
revoke all on function public.transition_proposal(uuid, text) from public, anon;
grant execute on function public.transition_proposal(uuid, text) to authenticated;

create or replace function public.issue_proposal_share(p_proposal_id uuid, p_token_hash text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  proposal_row public.proposals%rowtype;
  old_stage text;
  next_stage text;
begin
  if not workspace_private.is_workspace_admin() then
    raise exception 'workspace admin access required' using errcode = '42501';
  end if;
  if p_proposal_id is null or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid proposal share input' using errcode = '22023';
  end if;

  select * into proposal_row
  from public.proposals
  where id = p_proposal_id
  for update;
  if not found or proposal_row.status not in ('draft', 'sent') then
    return false;
  end if;

  update public.proposals
  set status = 'sent',
      sent_at = coalesce(sent_at, now()),
      share_token_hash = p_token_hash,
      share_token_expires_at = now() + interval '30 days',
      updated_at = now()
  where id = p_proposal_id;

  if proposal_row.status = 'draft' then
    insert into public.workflow_events(entity_type, entity_id, action, from_state, to_state, actor_email)
    values ('proposal', p_proposal_id, 'status_changed', 'draft', 'sent', lower(auth.jwt() ->> 'email'));

    if proposal_row.inquiry_id is not null then
      select stage into old_stage
      from public.inquiries
      where id = proposal_row.inquiry_id
      for update;
      if old_stage in ('new', 'discovery', 'qualified') then
        next_stage := 'proposal';
        update public.inquiries
        set stage = next_stage, updated_at = now()
        where id = proposal_row.inquiry_id;
        insert into public.workflow_events(entity_type, entity_id, action, from_state, to_state, actor_email)
        values ('inquiry', proposal_row.inquiry_id, 'proposal_status_changed', old_stage, next_stage, lower(auth.jwt() ->> 'email'));
      end if;
    end if;
  else
    insert into public.workflow_events(entity_type, entity_id, action, from_state, to_state, actor_email)
    values ('proposal', p_proposal_id, 'share_link_rotated', 'sent', 'sent', lower(auth.jwt() ->> 'email'));
  end if;
  return true;
end;
$$;
revoke all on function public.issue_proposal_share(uuid, text) from public, anon;
grant execute on function public.issue_proposal_share(uuid, text) to authenticated;

create or replace function public.get_proposal_for_review(p_token_hash text)
returns table (
  title text,
  summary text,
  proposal_url text,
  amount_cents integer,
  currency text,
  status text,
  version integer,
  sent_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.title, p.summary, p.proposal_url, p.amount_cents, p.currency,
         p.status, p.version, p.sent_at, p.accepted_at, p.share_token_expires_at
  from public.proposals p
  where p_token_hash ~ '^[a-f0-9]{64}$'
    and p.share_token_hash = p_token_hash
    and p.share_token_expires_at > now()
    and p.status in ('sent', 'accepted')
  limit 1;
$$;
revoke all on function public.get_proposal_for_review(text) from public, anon, authenticated;
grant execute on function public.get_proposal_for_review(text) to service_role;

create or replace function public.accept_proposal_with_token(p_token_hash text)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  proposal_row public.proposals%rowtype;
  old_stage text;
begin
  if p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$' then
    return 'unavailable';
  end if;

  select * into proposal_row
  from public.proposals
  where share_token_hash = p_token_hash
  for update;
  if not found then
    return 'unavailable';
  end if;
  if proposal_row.status = 'accepted' and proposal_row.accepted_at is not null then
    return 'accepted';
  end if;
  if proposal_row.status <> 'sent'
    or proposal_row.share_token_expires_at is null
    or proposal_row.share_token_expires_at <= now() then
    return 'unavailable';
  end if;

  update public.proposals
  set status = 'accepted', accepted_at = now(), updated_at = now()
  where id = proposal_row.id;
  insert into public.workflow_events(entity_type, entity_id, action, from_state, to_state, actor_email)
  values ('proposal', proposal_row.id, 'status_changed', 'sent', 'accepted', null);

  if proposal_row.inquiry_id is not null then
    select stage into old_stage
    from public.inquiries
    where id = proposal_row.inquiry_id
    for update;
    if old_stage = 'proposal' then
      update public.inquiries
      set stage = 'won', updated_at = now()
      where id = proposal_row.inquiry_id;
      insert into public.workflow_events(entity_type, entity_id, action, from_state, to_state, actor_email)
      values ('inquiry', proposal_row.inquiry_id, 'proposal_status_changed', 'proposal', 'won', null);
    end if;
  end if;
  return 'accepted';
end;
$$;
revoke all on function public.accept_proposal_with_token(text) from public, anon, authenticated;
grant execute on function public.accept_proposal_with_token(text) to service_role;

create or replace function public.convert_inquiry_to_client(p_inquiry_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source public.inquiries%rowtype;
  client_id uuid;
begin
  if not workspace_private.is_workspace_admin() then
    raise exception 'workspace admin access required' using errcode = '42501';
  end if;
  select * into source from public.inquiries where id = p_inquiry_id for update;
  if not found then
    raise exception 'inquiry not found' using errcode = 'P0002';
  end if;
  if source.stage not in ('proposal', 'won') then
    raise exception 'move the inquiry to proposal or won before creating a client' using errcode = '22023';
  end if;
  select id into client_id from public.clients where inquiry_id = p_inquiry_id;
  if client_id is not null then
    return client_id;
  end if;
  insert into public.clients(inquiry_id, full_name, company, email, phone)
  values (source.id, source.name, source.company, source.email, source.phone)
  returning id into client_id;
  if source.stage = 'proposal' then
    update public.inquiries set stage = 'won', updated_at = now() where id = p_inquiry_id;
    insert into public.workflow_events(entity_type, entity_id, action, from_state, to_state, actor_email)
    values ('inquiry', p_inquiry_id, 'client_created', 'proposal', 'won', lower(auth.jwt() ->> 'email'));
  end if;
  return client_id;
end;
$$;
revoke all on function public.convert_inquiry_to_client(uuid) from public, anon;
grant execute on function public.convert_inquiry_to_client(uuid) to authenticated;

create or replace function public.create_project_with_milestones(
  p_client_id uuid,
  p_title text,
  p_summary text default '',
  p_due_on date default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  project_id uuid;
begin
  if not workspace_private.is_workspace_admin() then
    raise exception 'workspace admin access required' using errcode = '42501';
  end if;
  insert into public.projects(client_id, title, summary, due_on)
  values (p_client_id, trim(p_title), coalesce(p_summary, ''), p_due_on)
  returning id into project_id;
  insert into public.milestones(project_id, title, position)
  values
    (project_id, 'Discovery & requirements approved', 1),
    (project_id, 'Design approved', 2),
    (project_id, 'Build reviewed', 3),
    (project_id, 'Launch & handover', 4);
  insert into public.workflow_events(entity_type, entity_id, action, to_state, actor_email)
  values ('project', project_id, 'project_created', 'not_started', lower(auth.jwt() ->> 'email'));
  return project_id;
end;
$$;
revoke all on function public.create_project_with_milestones(uuid, text, text, date) from public, anon;
grant execute on function public.create_project_with_milestones(uuid, text, text, date) to authenticated;

create or replace function public.transition_project(p_project_id uuid, p_status text, p_progress integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare old_status text;
begin
  if not workspace_private.is_workspace_admin() then
    raise exception 'workspace admin access required' using errcode = '42501';
  end if;
  if p_status not in ('not_started', 'in_progress', 'review', 'delivered', 'on_hold') or p_progress < 0 or p_progress > 100 then
    raise exception 'invalid project status or progress' using errcode = '22023';
  end if;
  select status into old_status from public.projects where id = p_project_id for update;
  if old_status is null then return false; end if;
  update public.projects set status = p_status, progress = p_progress, updated_at = now() where id = p_project_id;
  if old_status <> p_status then
    insert into public.workflow_events(entity_type, entity_id, action, from_state, to_state, actor_email)
    values ('project', p_project_id, 'status_changed', old_status, p_status, lower(auth.jwt() ->> 'email'));
  end if;
  return true;
end;
$$;
revoke all on function public.transition_project(uuid, text, integer) from public, anon;
grant execute on function public.transition_project(uuid, text, integer) to authenticated;

create or replace function public.transition_milestone(p_milestone_id uuid, p_status text)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare old_status text;
begin
  if not workspace_private.is_workspace_admin() then
    raise exception 'workspace admin access required' using errcode = '42501';
  end if;
  if p_status not in ('pending', 'in_progress', 'done') then
    raise exception 'invalid milestone status' using errcode = '22023';
  end if;
  select status into old_status from public.milestones where id = p_milestone_id for update;
  if old_status is null then return false; end if;
  update public.milestones set status = p_status, completed_at = case when p_status = 'done' then coalesce(completed_at, now()) else null end where id = p_milestone_id;
  if old_status <> p_status then
    insert into public.workflow_events(entity_type, entity_id, action, from_state, to_state, actor_email)
    values ('milestone', p_milestone_id, 'status_changed', old_status, p_status, lower(auth.jwt() ->> 'email'));
  end if;
  return true;
end;
$$;
revoke all on function public.transition_milestone(uuid, text) from public, anon;
grant execute on function public.transition_milestone(uuid, text) to authenticated;

create or replace function public.record_payfast_itn(
  p_invoice_id uuid,
  p_attempt_id uuid,
  p_provider_reference text,
  p_amount_cents integer,
  p_status text,
  p_notify_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_amount integer;
  invoice_status text;
  attempt_invoice_id uuid;
  primary_payment_id uuid;
  existing_payment_id uuid;
  duplicate_payment_id uuid;
  duplicate_of_id uuid;
begin
  select i.amount_cents, i.status into expected_amount, invoice_status
  from public.invoices i
  where i.id = p_invoice_id and i.currency = 'ZAR'
  for update;

  if expected_amount is null or invoice_status = 'void' or expected_amount <> p_amount_cents then
    raise exception 'invoice amount mismatch' using errcode = '22023';
  end if;
  if p_status not in ('pending', 'complete', 'failed', 'cancelled') then
    raise exception 'invalid payment status' using errcode = '22023';
  end if;
  select a.invoice_id into attempt_invoice_id
  from workspace_private.payment_attempts a
  where a.id = p_attempt_id and a.invoice_id = p_invoice_id
  for update;
  if attempt_invoice_id is null then
    raise exception 'payment attempt not found' using errcode = 'P0002';
  end if;
  if p_provider_reference is null or length(trim(p_provider_reference)) not between 1 and 110 then
    raise exception 'invalid provider reference' using errcode = '22023';
  end if;

  select p.id into primary_payment_id
  from public.payments p
  where p.invoice_id = p_invoice_id and p.status = 'complete' and p.duplicate_of is null
  order by p.created_at, p.id
  limit 1
  for update;
  select p.id into existing_payment_id
  from public.payments p
  where p.provider_reference = p_provider_reference;
  if p_status = 'complete' and primary_payment_id is not null
    and existing_payment_id is distinct from primary_payment_id then
    duplicate_of_id := primary_payment_id;
  else
    duplicate_of_id := null;
  end if;

  insert into public.payments(invoice_id, attempt_id, provider, provider_reference, amount_cents, currency, status, duplicate_of, notify_id)
  values (p_invoice_id, p_attempt_id, 'payfast', p_provider_reference, p_amount_cents, 'ZAR', p_status, duplicate_of_id, p_notify_id)
  on conflict (provider_reference) do update
    set status = case when public.payments.status = 'complete' then 'complete' else excluded.status end,
        duplicate_of = coalesce(public.payments.duplicate_of, excluded.duplicate_of),
        amount_cents = excluded.amount_cents,
        notify_id = coalesce(excluded.notify_id, public.payments.notify_id),
        updated_at = now()
    where public.payments.invoice_id = excluded.invoice_id
      and public.payments.attempt_id = excluded.attempt_id;

  if not found then
    raise exception 'provider reference is already linked to another invoice' using errcode = '23505';
  end if;
  select p.id into duplicate_payment_id
  from public.payments p
  where p.provider_reference = p_provider_reference and p.invoice_id = p_invoice_id
    and p.status = 'complete' and p.duplicate_of is not null;
  if p_status = 'complete' and duplicate_payment_id is null then
    update public.invoices set status = 'paid', updated_at = now() where id = p_invoice_id;
  end if;
  if p_status = 'complete' then
    update workspace_private.payment_attempts
    set status = 'complete', updated_at = now()
    where id = p_attempt_id;
    update workspace_private.payment_attempts
    set status = 'expired', updated_at = now()
    where invoice_id = p_invoice_id and id <> p_attempt_id and status = 'active';
  elsif p_status in ('failed', 'cancelled') then
    update workspace_private.payment_attempts
    set status = p_status, updated_at = now()
    where id = p_attempt_id and status = 'active';
  end if;
  insert into public.workflow_events(entity_type, entity_id, action, to_state)
  values ('payment', p_invoice_id,
          case when duplicate_payment_id is null then 'payfast:' else 'duplicate:' end || p_provider_reference,
          p_status)
  on conflict do nothing;
end;
$$;
create unique index workflow_payfast_event_once_idx
  on public.workflow_events (entity_type, entity_id, action)
  where entity_type = 'payment' and (action like 'payfast:%' or action like 'duplicate:%');
revoke all on function public.record_payfast_itn(uuid, uuid, text, integer, text, text) from public, anon, authenticated;
grant execute on function public.record_payfast_itn(uuid, uuid, text, integer, text, text) to service_role;

commit;
