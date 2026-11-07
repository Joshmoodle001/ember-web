begin;

create table public.outreach_preparations (
  prospect_id uuid primary key references public.outreach_prospects(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 2000),
  concept_summary jsonb not null check (jsonb_typeof(concept_summary) = 'object'),
  source_updated_at timestamptz not null,
  prepared_at timestamptz not null default now()
);
alter table public.outreach_preparations enable row level security;
revoke all on public.outreach_preparations from public, anon, authenticated;
grant select on public.outreach_preparations to authenticated;
create policy outreach_preparations_admin_read on public.outreach_preparations
  for select to authenticated using (workspace_private.is_workspace_admin());
grant select on public.outreach_prospects to service_role;
grant select, insert, update on public.outreach_preparations to service_role;

-- One owner-controlled activation, never a public sign-up route.
create table workspace_private.owner_activation (
  id boolean primary key default true check (id),
  code_hash text not null check (code_hash ~ '^[a-f0-9]{64}$'),
  user_id uuid not null references auth.users(id),
  expires_at timestamptz not null,
  claimed_at timestamptz
);
alter table workspace_private.owner_activation enable row level security;
revoke all on workspace_private.owner_activation from public, anon, authenticated, service_role;
grant select, update on workspace_private.owner_activation to service_role;

create function public.claim_owner_activation(p_code_hash text)
returns uuid language sql security invoker set search_path = '' as $$
  update workspace_private.owner_activation
     set claimed_at = now()
   where id = true and code_hash = p_code_hash
     and expires_at > now() and claimed_at is null
  returning user_id;
$$;
revoke all on function public.claim_owner_activation(text) from public, anon, authenticated;
grant execute on function public.claim_owner_activation(text) to service_role;

commit;
