begin;
create table public.lead_research_runs (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null, submission_id uuid not null,
 mode text not null check(mode in ('search','website')), input text not null check(char_length(input) between 2 and 2048),
 status text not null default 'running' check(status in ('running','completed','failed')),
 results jsonb not null default '[]'::jsonb check(jsonb_typeof(results)='array' and jsonb_array_length(results)<=10 and octet_length(results::text)<=100000),
 error_code text, elapsed_ms integer, created_at timestamptz not null default clock_timestamp(), finished_at timestamptz,
 unique(actor_id,submission_id)
);
create index lead_research_runs_time_idx on public.lead_research_runs(created_at desc);
create table public.research_leads (
 id uuid primary key default gen_random_uuid(), run_id uuid not null references public.lead_research_runs(id), result_index integer not null,
 name text not null, website text not null, email text not null default '', phone text not null default '', location text not null default '', summary text not null default '', source_url text not null,
 seed_id uuid references public.project_seeds(id), created_at timestamptz not null default clock_timestamp(), unique(run_id,result_index)
);
create index research_leads_time_idx on public.research_leads(created_at desc);
alter table public.lead_research_runs enable row level security;
alter table public.research_leads enable row level security;
revoke all on public.lead_research_runs,public.research_leads from public,anon,authenticated;
grant select,insert,update on public.lead_research_runs,public.research_leads to service_role;
create trigger lead_runs_audit after insert or update on public.lead_research_runs for each row execute function workspace_private.capture_workspace_audit();
create trigger research_leads_audit after insert or update on public.research_leads for each row execute function workspace_private.capture_workspace_audit();

create function public.workspace_lead_research(p_actor_id uuid,p_action text,p_payload jsonb default '{}'::jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare r public.lead_research_runs; l public.research_leads; v jsonb; s jsonb; n integer;
begin
 if workspace_private.actor_role(p_actor_id) is distinct from 'super_admin' then raise exception 'Super admin required' using errcode='42501'; end if;
 perform set_config('workspace.actor_id',p_actor_id::text,true); perform set_config('workspace.actor_kind','staff',true);
 if p_action='list' then
  n:=greatest(0,least(coalesce((p_payload->>'page')::integer,0),10000));
  return jsonb_build_object('runs',coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at desc) from(select * from public.lead_research_runs order by created_at desc limit 50 offset n*50)q),'[]'::jsonb),
    'leads',coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at desc) from(select * from public.research_leads order by created_at desc limit 100 offset n*100)q),'[]'::jsonb),
    'totalRuns',(select count(*) from public.lead_research_runs),'totalLeads',(select count(*) from public.research_leads));
 elsif p_action='begin' then
  perform pg_advisory_xact_lock(hashtextextended('lead-research-start',0));
  select * into r from public.lead_research_runs where actor_id=p_actor_id and submission_id=(p_payload->>'submissionId')::uuid;
  if found then
   if r.mode<>p_payload->>'mode' or r.input<>p_payload->>'input' then raise exception 'Submission changed' using errcode='22023'; end if;
   return jsonb_build_object('started',false,'run',to_jsonb(r));
  end if;
  if(select count(*) from public.lead_research_runs where status='running' and created_at>now()-interval '5 minutes')>=2 then raise exception 'Two runs already in progress' using errcode='40001'; end if;
  insert into public.lead_research_runs(actor_id,submission_id,mode,input) values(p_actor_id,(p_payload->>'submissionId')::uuid,p_payload->>'mode',p_payload->>'input') returning * into r;
  return jsonb_build_object('started',true,'run',to_jsonb(r));
 elsif p_action='finish' then
  update public.lead_research_runs set status=case when p_payload->>'errorCode' is null then 'completed' else 'failed' end,
   results=coalesce(p_payload->'results','[]'::jsonb),error_code=p_payload->>'errorCode',elapsed_ms=(p_payload->>'elapsedMs')::integer,finished_at=clock_timestamp()
   where id=(p_payload->>'runId')::uuid and actor_id=p_actor_id and status='running' returning * into r;
  if not found then raise exception 'Run unavailable' using errcode='22023'; end if;
  return to_jsonb(r);
 elsif p_action='save' then
  select * into r from public.lead_research_runs where id=(p_payload->>'runId')::uuid and status='completed';
  n:=(p_payload->>'index')::integer; v:=r.results->n;
  if v is null or n<0 then raise exception 'Result unavailable' using errcode='22023'; end if;
  insert into public.research_leads(run_id,result_index,name,website,email,phone,location,summary,source_url)
   values(r.id,n,v->>'name',v->>'website',coalesce(v->>'email',''),coalesce(v->>'phone',''),coalesce(v->>'location',''),coalesce(v->>'summary',''),v->>'sourceUrl')
   on conflict(run_id,result_index) do nothing;
  select * into l from public.research_leads where run_id=r.id and result_index=n;
  return to_jsonb(l);
 elsif p_action='promote' then
  select * into l from public.research_leads where id=(p_payload->>'leadId')::uuid for update;
  if not found then raise exception 'Lead unavailable' using errcode='22023'; end if;
  if l.seed_id is not null then return jsonb_build_object('seedId',l.seed_id); end if;
  s:=public.workspace_command(p_actor_id,jsonb_build_object('action','create','submissionId',p_payload->>'submissionId','title',p_payload->>'title','contactName',p_payload->>'contactName','email',p_payload->>'email','brief',p_payload->>'brief'));
  update public.research_leads set seed_id=(s->>'seedId')::uuid where id=l.id;
  return s;
 end if;
 raise exception 'Unsupported action' using errcode='22023';
end $$;
revoke all on function public.workspace_lead_research(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.workspace_lead_research(uuid,text,jsonb) to service_role;
notify pgrst,'reload schema';
commit;
