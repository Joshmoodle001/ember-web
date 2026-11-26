alter table public.inquiries
  add column if not exists inquiry_permission_at timestamptz,
  add column if not exists marketing_permission_at timestamptz,
  add column if not exists consent_policy_version text,
  add column if not exists consent_form text check (consent_form in ('brief', 'audit')),
  add column if not exists qualified_booked_at timestamptz,
  add column if not exists acquisition_campaign text check (acquisition_campaign = 'gauteng_workshops'),
  add column if not exists acquisition_source text
    check (acquisition_source in ('direct', 'linkedin', 'referral', 'organic', 'partner'));

comment on column public.inquiries.marketing_permission_at is
  'Explicit optional marketing opt-in. NULL represents no documented opt-in.';

create table public.inquiry_funnel_daily (
  day date not null default ((now() at time zone 'Africa/Johannesburg')::date),
  source text not null check (source in ('direct', 'linkedin', 'referral', 'organic', 'partner')),
  milestone text not null check (milestone in ('landing_visit', 'audit_start')),
  total bigint not null default 1,
  primary key (day, source, milestone)
);

alter table public.inquiry_funnel_daily enable row level security;
revoke all on public.inquiry_funnel_daily from public, anon, authenticated;
grant select, insert, update on public.inquiry_funnel_daily to service_role;

create function public.record_inquiry_funnel(milestone_name text, source_name text)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.inquiry_funnel_daily (milestone, source)
  values (milestone_name, source_name)
  on conflict (day, source, milestone)
  do update set total = public.inquiry_funnel_daily.total + 1;
$$;
revoke execute on function public.record_inquiry_funnel(text, text) from public, anon, authenticated;
grant execute on function public.record_inquiry_funnel(text, text) to service_role;
