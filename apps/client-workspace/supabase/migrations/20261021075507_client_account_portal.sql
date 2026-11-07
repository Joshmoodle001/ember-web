begin;
create table public.client_portal_memberships (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.clients(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(client_id,user_id)
);
alter table public.client_portal_memberships enable row level security;
revoke all on public.client_portal_memberships from public,anon,authenticated;
grant select,insert,update,delete on public.client_portal_memberships to authenticated,service_role;
create policy membership_admin on public.client_portal_memberships for all to authenticated using(workspace_private.is_workspace_admin()) with check(workspace_private.is_workspace_admin());
create policy membership_self_read on public.client_portal_memberships for select to authenticated using(user_id=(select auth.uid()) and active);
create table public.client_project_resources (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 title text not null check(char_length(trim(title)) between 2 and 180),
 description text not null default '' check(char_length(description)<=2000),
 kind text not null check(kind in ('website','app','feature','document')),
 url text not null check(char_length(url)<=2000 and url ~ '^https://[^/@[:space:]]+\.[^/@[:space:]]+(/|$)'),
 created_at timestamptz not null default now()
);
alter table public.client_project_resources enable row level security;
revoke all on public.client_project_resources from public,anon,authenticated;
grant select,insert,update,delete on public.client_project_resources to authenticated,service_role;
create policy resource_admin on public.client_project_resources for all to authenticated using(workspace_private.is_workspace_admin()) with check(workspace_private.is_workspace_admin());
grant select on public.clients,public.projects,public.milestones,public.invoices to service_role;
create or replace function public.get_client_account(p_user_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'client', jsonb_build_object('id',c.id,'full_name',c.full_name,'company',c.company,'email',c.email),
 'projects',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'status',p.status,'progress',p.progress,'due_on',p.due_on,
 'milestones',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'title',m.title,'status',m.status,'position',m.position,'due_on',m.due_on,'completed_at',m.completed_at) order by m.position) from public.milestones m where m.project_id=p.id),'[]'::jsonb),
 'resources',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'title',r.title,'description',r.description,'url',r.url,'kind',r.kind) order by r.created_at) from public.client_project_resources r where r.project_id=p.id),'[]'::jsonb)
 ) order by p.created_at desc) from public.projects p where p.client_id=c.id),'[]'::jsonb),
 'invoices',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'invoice_number',i.invoice_number,'description',i.description,'amount_cents',i.amount_cents,'currency',i.currency,'status',i.status,'due_on',i.due_on) order by i.created_at desc) from public.invoices i where i.client_id=c.id and i.archived_at is null and i.status in ('sent','overdue','paid')),'[]'::jsonb)
 )),'[]'::jsonb)
 from public.clients c join public.client_portal_memberships pm on pm.client_id=c.id
 where pm.user_id=p_user_id and pm.active and c.archived_at is null;
$$;
revoke all on function public.get_client_account(uuid) from public,anon,authenticated;
grant execute on function public.get_client_account(uuid) to service_role;
commit;
