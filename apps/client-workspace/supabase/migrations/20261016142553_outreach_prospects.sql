-- Private prospect records are separate from public client inquiries.
-- Apply only to the configured client-workspace Supabase project.

begin;

create table public.outreach_prospects (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(trim(business_name)) between 2 and 180),
  industry text not null default '' check (char_length(industry) <= 100),
  city text not null default '' check (char_length(city) <= 120),
  website text not null default '' check (char_length(website) <= 2048),
  phone text not null default '' check (char_length(phone) <= 60),
  email text not null default '' check (
    char_length(email) <= 254
    and (email = '' or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  ),
  notes text not null default '' check (char_length(notes) <= 4000),
  permission_status text not null default 'unconfirmed'
    check (permission_status in ('unconfirmed', 'opted_in', 'existing_customer', 'do_not_contact')),
  permission_note text not null default '' check (char_length(permission_note) <= 1000),
  status text not null default 'research'
    check (status in ('research', 'ready', 'contacted', 'replied', 'booked', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    permission_status not in ('opted_in', 'existing_customer')
    or char_length(trim(permission_note)) between 10 and 1000
  )
);

create index outreach_prospects_status_updated_idx
  on public.outreach_prospects (status, updated_at desc);
create index outreach_prospects_business_city_idx
  on public.outreach_prospects (lower(business_name), lower(city));

alter table public.outreach_prospects enable row level security;
revoke all on public.outreach_prospects from public, anon, authenticated;
grant select, insert, update on public.outreach_prospects to authenticated;
create policy outreach_prospects_admin_select on public.outreach_prospects
  for select to authenticated
  using (workspace_private.is_workspace_admin());
create policy outreach_prospects_admin_insert on public.outreach_prospects
  for insert to authenticated
  with check (workspace_private.is_workspace_admin());
create policy outreach_prospects_admin_update on public.outreach_prospects
  for update to authenticated
  using (workspace_private.is_workspace_admin())
  with check (workspace_private.is_workspace_admin());

commit;
