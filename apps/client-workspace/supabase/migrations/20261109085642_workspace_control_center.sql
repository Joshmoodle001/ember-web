-- Additive extension of the inspected EmberWeb workspace, hbdxhbwufgkrwqxpieds.
begin;
alter table public.workspace_admins add column role text not null default 'admin' check(role in ('super_admin','admin'));
update public.workspace_admins set role='super_admin' where email='joshmoodley01@gmail.com';

create function workspace_private.actor_role(p_actor uuid) returns text
language sql stable security invoker set search_path='' as $$
 select case when a.active then a.role when exists(select 1 from public.client_portal_memberships m join public.clients c on c.id=m.client_id where m.user_id=u.id and m.active and c.archived_at is null) then 'client' end
 from auth.users u left join public.workspace_admins a on a.email=lower(u.email)
 where u.id=p_actor and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<now());
$$;
revoke all on function workspace_private.actor_role(uuid) from public,anon,authenticated;
grant execute on function workspace_private.actor_role(uuid) to service_role;
create function public.workspace_identity(p_actor_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',u.id,'email',u.email,'role',workspace_private.actor_role(u.id)) from auth.users u where u.id=p_actor_id;
$$;
revoke all on function public.workspace_identity(uuid) from public,anon,authenticated;
grant execute on function public.workspace_identity(uuid) to service_role;
create or replace function workspace_private.is_workspace_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.workspace_admins a join auth.users u on lower(u.email)=a.email where u.id=auth.uid() and a.active and u.email_confirmed_at is not null and u.deleted_at is null and (u.banned_until is null or u.banned_until<now()));
$$;
revoke all on function workspace_private.is_workspace_admin() from public,anon;
grant execute on function workspace_private.is_workspace_admin() to authenticated,service_role;

create table public.workspace_audit (
 id bigint generated always as identity primary key,
 occurred_at timestamptz not null default clock_timestamp(),
 actor_id uuid,
 actor_kind text not null default 'system' check(actor_kind in ('system','staff','client','agent')),
 entity_table text not null,
 entity_id text,
 action text not null,
 detail jsonb not null default '{}'::jsonb
);
alter table public.workspace_audit enable row level security;
revoke all on public.workspace_audit from public,anon,authenticated,service_role;
grant select,insert on public.workspace_audit to service_role;
grant usage,select on sequence public.workspace_audit_id_seq to service_role;
create function workspace_private.audit_immutable() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Audit entries cannot be changed' using errcode='42501'; end $$;
create trigger immutable_audit before update or delete on public.workspace_audit for each row execute function workspace_private.audit_immutable();
create index workspace_audit_time_idx on public.workspace_audit(occurred_at desc,id desc);
create index workspace_audit_actor_idx on public.workspace_audit(actor_id,occurred_at desc);

create table public.project_seeds (
 id uuid primary key default gen_random_uuid(),
 inquiry_id uuid unique references public.inquiries(id) on delete set null,
 client_id uuid references public.clients(id) on delete restrict,
 title text not null check(char_length(trim(title)) between 2 and 180),
 contact_name text not null check(char_length(trim(contact_name)) between 2 and 160),
 email text not null check(char_length(email)<=254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
 brief text not null check(char_length(trim(brief)) between 2 and 5000),
 stage text not null default 'starting' check(stage in ('starting','allocated','discussion','development','building','testing','final_quality_checks','live')),
 assignee_id uuid,
 project_id uuid unique references public.projects(id) on delete restrict,
 version integer not null default 1,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 check((assignee_id is null and project_id is null and stage='starting') or (assignee_id is not null and project_id is not null and stage<>'starting'))
);
create index project_seeds_stage_idx on public.project_seeds(stage,updated_at desc);
create index project_seeds_assignee_idx on public.project_seeds(assignee_id,updated_at desc);
create table public.project_seed_updates (
 id uuid primary key default gen_random_uuid(),
 seed_id uuid not null references public.project_seeds(id) on delete restrict,
 actor_id uuid,
 actor_kind text not null check(actor_kind in ('staff','agent')),
 internal_body text not null check(char_length(trim(internal_body)) between 2 and 8000),
 client_summary text check(char_length(client_summary)<=3000),
 published_at timestamptz,
 published_by uuid,
 created_at timestamptz not null default clock_timestamp(),
 check(published_at is null or (client_summary is not null and char_length(trim(client_summary))>=2 and published_by is not null))
);
create index project_seed_updates_seed_time_idx on public.project_seed_updates(seed_id,created_at desc,id desc);
create table public.project_agent_keys (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete restrict,
 label text not null check(char_length(label) between 2 and 100),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 created_by uuid not null,
 created_at timestamptz not null default clock_timestamp(),
 expires_at timestamptz not null default now()+interval '30 days',
 revoked_at timestamptz,
 last_used_at timestamptz
);
create index project_agent_keys_project_idx on public.project_agent_keys(project_id);
create table public.workspace_presence (
 user_id uuid primary key,
 path text not null check(char_length(path)<=160),
 project_id uuid,
 last_seen_at timestamptz not null default clock_timestamp()
);
create table workspace_private.command_receipts (
 actor_key text not null,
 submission_id uuid not null,
 payload_hash text not null,
 result jsonb not null,
 created_at timestamptz not null default now(),
 primary key(actor_key,submission_id)
);
alter table public.project_seeds enable row level security;
alter table public.project_seed_updates enable row level security;
alter table public.project_agent_keys enable row level security;
alter table public.workspace_presence enable row level security;
alter table workspace_private.command_receipts enable row level security;
revoke all on public.project_seeds,public.project_seed_updates,public.project_agent_keys,public.workspace_presence,workspace_private.command_receipts from public,anon,authenticated;
grant select,insert,update on public.project_seeds,public.project_seed_updates,public.project_agent_keys,public.workspace_presence,workspace_private.command_receipts to service_role;

create function workspace_private.capture_workspace_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare v_old jsonb; v_new jsonb; v_actor uuid; v_kind text;
begin
 v_actor:=coalesce(auth.uid(),nullif(current_setting('workspace.actor_id',true),'')::uuid);
 v_kind:=coalesce(nullif(current_setting('workspace.actor_kind',true),''),case when v_actor is null then 'system' else 'staff' end);
 if TG_OP<>'INSERT' then v_old:=to_jsonb(OLD)-array['token_hash','share_token_hash']; end if;
 if TG_OP<>'DELETE' then v_new:=to_jsonb(NEW)-array['token_hash','share_token_hash']; end if;
 insert into public.workspace_audit(actor_id,actor_kind,entity_table,entity_id,action,detail)
 values(v_actor,v_kind,TG_TABLE_NAME,coalesce(v_new->>'id',v_old->>'id',v_new->>'email',v_old->>'email'),lower(TG_OP),jsonb_build_object('before',v_old,'after',v_new));
 if TG_OP='DELETE' then return OLD; end if; return NEW;
end $$;
revoke all on function workspace_private.capture_workspace_audit() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['workspace_admins','inquiries','clients','projects','milestones','client_portal_memberships','client_project_resources','client_requests','client_request_messages','project_seeds','project_seed_updates','project_agent_keys','invoices','proposals','payments','meetings','outreach_prospects'] loop
 execute format('create trigger workspace_audit_changes after insert or update or delete on public.%I for each row execute function workspace_private.capture_workspace_audit()',t);
 end loop;
end $$;

create function workspace_private.inquiry_seed() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.project_seeds(inquiry_id,title,contact_name,email,brief)
 values(NEW.id,left(coalesce(nullif(NEW.company,''),NEW.name)||' / '||replace(NEW.service,'_',' '),180),NEW.name,NEW.email,NEW.brief)
 on conflict(inquiry_id) do nothing;
 return NEW;
end $$;
revoke all on function workspace_private.inquiry_seed() from public,anon,authenticated;
create trigger inquiry_creates_seed after insert on public.inquiries for each row when(NEW.archived_at is null) execute function workspace_private.inquiry_seed();
insert into public.project_seeds(inquiry_id,title,contact_name,email,brief)
select id,left(coalesce(nullif(company,''),name)||' / '||replace(service,'_',' '),180),name,email,brief from public.inquiries where archived_at is null on conflict(inquiry_id) do nothing;

create function public.workspace_board(p_actor_id uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if coalesce(workspace_private.actor_role(p_actor_id),'') not in ('admin','super_admin') then raise exception 'Staff access required' using errcode='42501'; end if;
 return jsonb_build_object('identity',(select public.workspace_identity(p_actor_id)),
 'seeds',coalesce((select jsonb_agg(to_jsonb(s) order by s.updated_at desc) from (select * from public.project_seeds order by updated_at desc limit 500) s),'[]'::jsonb),
 'staff',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'role',a.role)) from public.workspace_admins a join auth.users u on lower(u.email)=a.email where a.active and u.deleted_at is null),'[]'::jsonb),
 'total',(select count(*) from public.project_seeds));
end $$;
create function public.workspace_card(p_actor_id uuid,p_seed_id uuid,p_before_time timestamptz default null,p_before_id uuid default null) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if coalesce(workspace_private.actor_role(p_actor_id),'') not in ('admin','super_admin') then raise exception 'Staff access required' using errcode='42501'; end if;
 return jsonb_build_object('seed',(select to_jsonb(s) from public.project_seeds s where s.id=p_seed_id),
 'updates',coalesce((select jsonb_agg(to_jsonb(u) order by u.created_at desc,u.id desc) from (select * from public.project_seed_updates where seed_id=p_seed_id and (p_before_time is null or (created_at,id)<(p_before_time,p_before_id)) order by created_at desc,id desc limit 100) u),'[]'::jsonb),
 'agents',coalesce((select jsonb_agg(jsonb_build_object('id',k.id,'label',k.label,'expires_at',k.expires_at,'revoked_at',k.revoked_at,'last_used_at',k.last_used_at)) from public.project_agent_keys k join public.project_seeds s on s.project_id=k.project_id where s.id=p_seed_id),'[]'::jsonb));
end $$;

create function public.workspace_command(p_actor_id uuid,p_payload jsonb) returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare r text; action text; sid uuid; sub uuid; s public.project_seeds%rowtype; result jsonb; receipt workspace_private.command_receipts%rowtype; fingerprint text; cid uuid; pid uuid; v_stage text; v_progress int;
begin
 r:=workspace_private.actor_role(p_actor_id);
 if coalesce(r,'') not in ('admin','super_admin') then raise exception 'Staff access required' using errcode='42501'; end if;
 perform set_config('workspace.actor_id',p_actor_id::text,true); perform set_config('workspace.actor_kind','staff',true);
 action:=p_payload->>'action'; sub:=(p_payload->>'submissionId')::uuid;
 if sub is null then raise exception 'Submission reference required' using errcode='22023'; end if;
 fingerprint:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(p_actor_id::text||sub::text,0));
 select * into receipt from workspace_private.command_receipts where actor_key=p_actor_id::text and submission_id=sub;
 if found then
   if receipt.payload_hash<>fingerprint then raise exception 'Submission reference changed' using errcode='22023'; end if;
   return receipt.result;
 end if;
 if action='create' then
   insert into public.project_seeds(title,contact_name,email,brief,client_id) values(trim(p_payload->>'title'),trim(p_payload->>'contactName'),lower(trim(p_payload->>'email')),trim(p_payload->>'brief'),nullif(p_payload->>'clientId','')::uuid) returning id into sid;
 else
   sid:=(p_payload->>'seedId')::uuid;
   select * into s from public.project_seeds where id=sid for update;
   if not found then raise exception 'Seed unavailable' using errcode='42501'; end if;
   if action='claim' then
     if s.assignee_id is not null and s.assignee_id<>p_actor_id then raise exception 'Already allocated' using errcode='40001'; end if;
     if s.project_id is null then
       cid:=s.client_id;
       if cid is null and s.inquiry_id is not null then select id into cid from public.clients where inquiry_id=s.inquiry_id and archived_at is null; end if;
       if cid is null then insert into public.clients(inquiry_id,full_name,email) values(s.inquiry_id,s.contact_name,s.email) returning id into cid; end if;
       insert into public.projects(client_id,title,summary) values(cid,s.title,s.brief) returning id into pid;
       update public.project_seeds set client_id=cid,project_id=pid,assignee_id=p_actor_id,stage='allocated',version=version+1,updated_at=clock_timestamp() where id=sid;
     end if;
   elsif action in ('stage','edit','reassign') then
     if s.assignee_id is null or (s.assignee_id<>p_actor_id and r<>'super_admin') then raise exception 'Assigned admin required' using errcode='42501'; end if;
     if (p_payload->>'version')::int is distinct from s.version then raise exception 'This card has changed. Review the latest version.' using errcode='40001'; end if;
     if action='stage' then
       v_stage:=p_payload->>'stage'; v_progress:=(p_payload->>'progress')::int;
       if v_stage not in ('allocated','discussion','development','building','testing','final_quality_checks','live') or v_progress is null or v_progress<0 or v_progress>100 then raise exception 'Invalid delivery stage' using errcode='22023'; end if;
       if v_stage='live' then v_progress:=100; end if;
       update public.project_seeds set stage=v_stage,version=version+1,updated_at=clock_timestamp() where id=sid;
       update public.projects set progress=v_progress,status=case when v_stage='live' then 'delivered' when v_stage in ('testing','final_quality_checks') then 'review' else 'in_progress' end,updated_at=clock_timestamp() where id=s.project_id;
     elsif action='edit' then
       update public.project_seeds set title=trim(p_payload->>'title'),brief=trim(p_payload->>'brief'),version=version+1,updated_at=clock_timestamp() where id=sid;
       update public.projects set title=trim(p_payload->>'title'),summary=trim(p_payload->>'brief'),updated_at=clock_timestamp() where id=s.project_id;
     else
       if r<>'super_admin' or coalesce(workspace_private.actor_role((p_payload->>'assigneeId')::uuid),'') not in ('admin','super_admin') then raise exception 'Super admin and active assignee required' using errcode='42501'; end if;
       update public.project_seeds set assignee_id=(p_payload->>'assigneeId')::uuid,version=version+1,updated_at=clock_timestamp() where id=sid;
     end if;
   elsif action='comment' then
     insert into public.project_seed_updates(seed_id,actor_id,actor_kind,internal_body,client_summary) values(sid,p_actor_id,'staff',trim(p_payload->>'body'),nullif(trim(p_payload->>'clientSummary'),''));
   elsif action='publish' then
     if s.assignee_id is null or (s.assignee_id<>p_actor_id and r<>'super_admin') then raise exception 'Assigned admin required' using errcode='42501'; end if;
     update public.project_seed_updates set client_summary=trim(p_payload->>'clientSummary'),published_by=p_actor_id,published_at=clock_timestamp() where id=(p_payload->>'updateId')::uuid and seed_id=sid and published_at is null;
     if not found then raise exception 'Update unavailable' using errcode='22023'; end if;
   elsif action='revoke_agent' then
     if s.assignee_id<>p_actor_id and r<>'super_admin' then raise exception 'Assigned admin required' using errcode='42501'; end if;
     update public.project_agent_keys set revoked_at=clock_timestamp() where id=(p_payload->>'agentId')::uuid and project_id=s.project_id;
   else raise exception 'Unknown action' using errcode='22023'; end if;
 end if;
 result:=jsonb_build_object('seedId',sid,'version',(select version from public.project_seeds where id=sid));
 insert into workspace_private.command_receipts(actor_key,submission_id,payload_hash,result) values(p_actor_id::text,sub,fingerprint,result);
 return result;
end $$;

create function public.workspace_agent_key(p_actor_id uuid,p_project_id uuid,p_label text,p_token_hash text) returns uuid language plpgsql security invoker set search_path='' as $$
declare k uuid; s public.project_seeds%rowtype; r text;
begin
 r:=workspace_private.actor_role(p_actor_id);
 select * into s from public.project_seeds where project_id=p_project_id for update;
 if not found or coalesce(r,'') not in ('admin','super_admin') or (s.assignee_id<>p_actor_id and r<>'super_admin') then raise exception 'Project access denied' using errcode='42501'; end if;
 if (select count(*) from public.project_agent_keys where project_id=p_project_id and revoked_at is null and expires_at>now())>=5 then raise exception 'Revoke an existing agent connection first' using errcode='22023'; end if;
 perform set_config('workspace.actor_id',p_actor_id::text,true);
 insert into public.project_agent_keys(project_id,label,token_hash,created_by) values(p_project_id,p_label,p_token_hash,p_actor_id) returning id into k;
 return k;
end $$;
create function public.workspace_agent_access(p_project_id uuid,p_hash text,p_payload jsonb default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare k public.project_agent_keys%rowtype; s public.project_seeds%rowtype; sub uuid; receipt workspace_private.command_receipts%rowtype; fingerprint text; result jsonb; stage text;
begin
 select * into k from public.project_agent_keys where project_id=p_project_id and token_hash=p_hash and revoked_at is null and expires_at>now() for update;
 if not found then raise exception 'Invalid project credential' using errcode='42501'; end if;
 select * into s from public.project_seeds where project_id=p_project_id for update;
 if not found then raise exception 'Project unavailable' using errcode='42501'; end if;
 perform set_config('workspace.actor_id',k.id::text,true); perform set_config('workspace.actor_kind','agent',true);
 update public.project_agent_keys set last_used_at=clock_timestamp() where id=k.id;
 if p_payload is null then
   return jsonb_build_object('projectId',s.project_id,'title',s.title,'brief',s.brief,'stage',s.stage,'version',s.version,'updates',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'body',u.internal_body,'createdAt',u.created_at) order by u.created_at desc) from (select * from public.project_seed_updates where seed_id=s.id order by created_at desc limit 100) u),'[]'::jsonb));
 end if;
 sub:=(p_payload->>'submissionId')::uuid;
 if sub is null then raise exception 'Submission reference required' using errcode='22023'; end if;
 fingerprint:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
 select * into receipt from workspace_private.command_receipts where actor_key=k.id::text and submission_id=sub;
 if found then if receipt.payload_hash<>fingerprint then raise exception 'Submission changed' using errcode='22023'; end if; return receipt.result; end if;
 if p_payload ? 'stage' then
   if (p_payload->>'version')::int is distinct from s.version then raise exception 'Project version changed' using errcode='40001'; end if;
   stage:=p_payload->>'stage';
   if stage not in ('allocated','discussion','development','building','testing','final_quality_checks','live') then raise exception 'Invalid stage' using errcode='22023'; end if;
   update public.project_seeds set stage=workspace_agent_access.stage,version=version+1,updated_at=clock_timestamp() where id=s.id;
   update public.projects set status=case when workspace_agent_access.stage='live' then 'delivered' when workspace_agent_access.stage in ('testing','final_quality_checks') then 'review' else 'in_progress' end,progress=case when workspace_agent_access.stage='live' then 100 else progress end,updated_at=clock_timestamp() where id=p_project_id;
 end if;
 insert into public.project_seed_updates(seed_id,actor_id,actor_kind,internal_body,client_summary) values(s.id,k.id,'agent',trim(p_payload->>'body'),nullif(trim(p_payload->>'clientSummary'),''));
 result:=jsonb_build_object('recorded',true,'clientPublished',false,'version',(select version from public.project_seeds where id=s.id));
 insert into workspace_private.command_receipts(actor_key,submission_id,payload_hash,result) values(k.id::text,sub,fingerprint,result);
 return result;
end $$;

create function public.workspace_client_updates(p_actor_id uuid) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if workspace_private.actor_role(p_actor_id) is distinct from 'client' then raise exception 'Client access required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'project_id',s.project_id,'title',s.title,'summary',u.client_summary,'published_at',u.published_at) order by u.published_at desc) from public.project_seed_updates u join public.project_seeds s on s.id=u.seed_id where u.published_at is not null and exists(select 1 from public.client_portal_memberships m join public.clients c on c.id=m.client_id where m.user_id=p_actor_id and m.active and c.id=s.client_id and c.archived_at is null)),'[]'::jsonb);
end $$;

create function public.workspace_presence_record(p_actor_id uuid,p_path text,p_project_id uuid default null) returns void language plpgsql security invoker set search_path='' as $$
declare r text; prior_path text;
begin
 r:=workspace_private.actor_role(p_actor_id);
 if r is null or p_path !~ '^/(admin|account)(/[-a-zA-Z0-9_/]*)?$' or char_length(p_path)>160 then raise exception 'Access denied' using errcode='42501'; end if;
 if r='client' and p_path !~ '^/account(/|$)' then raise exception 'Client route required' using errcode='42501'; end if;
 if p_project_id is not null and not exists(select 1 from public.projects p where p.id=p_project_id and (r in ('admin','super_admin') or exists(select 1 from public.client_portal_memberships m where m.client_id=p.client_id and m.user_id=p_actor_id and m.active))) then raise exception 'Project access denied' using errcode='42501'; end if;
 select path into prior_path from public.workspace_presence where user_id=p_actor_id;
 insert into public.workspace_presence(user_id,path,project_id) values(p_actor_id,p_path,p_project_id) on conflict(user_id) do update set path=excluded.path,project_id=excluded.project_id,last_seen_at=clock_timestamp();
 if prior_path is distinct from p_path then insert into public.workspace_audit(actor_id,actor_kind,entity_table,entity_id,action,detail) values(p_actor_id,case when r='client' then 'client' else 'staff' end,'workspace_presence',p_actor_id::text,'view',jsonb_build_object('path',p_path,'projectId',p_project_id)); end if;
end $$;
create function public.workspace_super_report(p_actor_id uuid,p_before bigint default null) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if workspace_private.actor_role(p_actor_id) is distinct from 'super_admin' then raise exception 'Super admin required' using errcode='42501'; end if;
 return jsonb_build_object('audit',coalesce((select jsonb_agg(to_jsonb(a) order by a.id desc) from (select * from public.workspace_audit where p_before is null or id<p_before order by id desc limit 100) a),'[]'::jsonb),
 'presence',coalesce((select jsonb_agg(jsonb_build_object('userId',p.user_id,'email',u.email,'path',p.path,'projectId',p.project_id,'lastSeen',p.last_seen_at)) from public.workspace_presence p join auth.users u on u.id=p.user_id),'[]'::jsonb),
 'activity',coalesce((select jsonb_agg(to_jsonb(x)) from (select actor_id,actor_kind,count(*) as events,max(occurred_at) as last_activity from public.workspace_audit where occurred_at>now()-interval '7 days' group by actor_id,actor_kind) x),'[]'::jsonb),
 'daily',coalesce((select jsonb_agg(to_jsonb(x) order by x.day) from (select (occurred_at at time zone 'Africa/Johannesburg')::date as day,count(*) as events from public.workspace_audit where occurred_at>now()-interval '14 days' group by 1) x),'[]'::jsonb),
 'pipeline',coalesce((select jsonb_object_agg(stage,n) from (select stage,count(*) n from public.project_seeds group by stage) x),'{}'::jsonb));
end $$;

create function public.workspace_account_access(p_actor_id uuid,p_target_id uuid,p_action text,p_role text default null,p_client_id uuid default null) returns void language plpgsql security invoker set search_path='' as $$
declare target_email text;
begin
 if workspace_private.actor_role(p_actor_id) is distinct from 'super_admin' then raise exception 'Super admin required' using errcode='42501'; end if;
 select lower(email) into target_email from auth.users where id=p_target_id;
 if target_email is null then raise exception 'Account unavailable' using errcode='22023'; end if;
 if p_actor_id=p_target_id or target_email='joshmoodley01@gmail.com' then raise exception 'The owner account is protected' using errcode='42501'; end if;
 perform set_config('workspace.actor_id',p_actor_id::text,true); perform set_config('workspace.actor_kind','staff',true);
 if p_action='grant' then
   if p_role='admin' then insert into public.workspace_admins(email,active,role) values(target_email,true,'admin') on conflict(email) do update set active=true,role='admin';
   elsif p_role='client' and exists(select 1 from public.clients where id=p_client_id and archived_at is null) then
     update public.workspace_admins set active=false where email=target_email;
     insert into public.client_portal_memberships(client_id,user_id,active) values(p_client_id,p_target_id,true) on conflict(client_id,user_id) do update set active=true;
   else raise exception 'Choose a staff role or an approved client business' using errcode='22023'; end if;
 elsif p_action='revoke' then
   update public.workspace_admins set active=false where email=target_email;
   update public.client_portal_memberships set active=false where user_id=p_target_id;
   delete from auth.sessions where user_id=p_target_id;
 else raise exception 'Unknown access action' using errcode='22023'; end if;
 insert into public.workspace_audit(actor_id,actor_kind,entity_table,entity_id,action,detail) values(p_actor_id,'staff','accounts',p_target_id::text,p_action,jsonb_build_object('role',p_role,'clientId',p_client_id));
end $$;

create function public.workspace_log_event(p_actor_id uuid,p_action text,p_entity_id text default null) returns void language plpgsql security invoker set search_path='' as $$
declare r text;
begin
 r:=workspace_private.actor_role(p_actor_id);
 if r is null or p_action not in ('sign_in','sign_out','password_changed','account_invited','account_details_changed','account_deleted','password_email_sent') or char_length(coalesce(p_entity_id,''))>180 then raise exception 'Invalid account event' using errcode='42501'; end if;
 insert into public.workspace_audit(actor_id,actor_kind,entity_table,entity_id,action) values(p_actor_id,case when r='client' then 'client' else 'staff' end,'accounts',coalesce(p_entity_id,p_actor_id::text),p_action);
end $$;

do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('workspace_board','workspace_card','workspace_command','workspace_agent_key','workspace_agent_access','workspace_client_updates','workspace_presence_record','workspace_super_report','workspace_account_access','workspace_log_event') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
grant insert,update on public.projects,public.clients to service_role;
grant select,insert,update on public.workspace_admins to service_role;
-- No anonymous or authenticated role can read raw internal updates or credential hashes.
commit;
