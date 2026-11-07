begin;
-- Only the approved EmberWeb project hbdxhbwufgkrwqxpieds.
create table public.client_requests (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.clients(id) on delete restrict,
 project_id uuid references public.projects(id) on delete restrict,
 created_by uuid not null references auth.users(id) on delete restrict,
 submission_id uuid not null,
 subject text not null check(char_length(trim(subject)) between 2 and 180),
 description text not null check(char_length(trim(description)) between 2 and 4000),
 status text not null default 'open' check(status in ('open','in_progress','waiting_on_client','resolved')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(created_by,submission_id)
);
create table public.client_request_messages (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.client_requests(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete restrict,
 author_role text not null check(author_role in ('client','staff')),
 submission_id uuid not null,
 body text not null check(char_length(trim(body)) between 2 and 4000),
 created_at timestamptz not null default now(),
 unique(author_id,submission_id)
);
create index client_requests_client_updated_idx on public.client_requests(client_id,updated_at desc);
create index client_request_messages_request_created_idx on public.client_request_messages(request_id,created_at);
alter table public.client_requests enable row level security;
alter table public.client_request_messages enable row level security;
revoke all on public.client_requests,public.client_request_messages from public,anon,authenticated;
grant select,insert,update,delete on public.client_requests,public.client_request_messages to authenticated,service_role;
create policy request_admin on public.client_requests for all to authenticated using(workspace_private.is_workspace_admin()) with check(workspace_private.is_workspace_admin());
create policy request_message_admin on public.client_request_messages for all to authenticated using(workspace_private.is_workspace_admin()) with check(workspace_private.is_workspace_admin());
grant select on public.workspace_admins to service_role;
-- Row-locking SELECTs require UPDATE privilege on at least one column.
grant update(id) on public.clients,public.projects to service_role;

create function public.list_client_requests(p_actor_id uuid,p_staff boolean default false) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
begin
 if p_staff is null then raise exception 'Access mode required' using errcode='22023'; end if;
 if not exists(select 1 from auth.users where id=p_actor_id and email_confirmed_at is not null) then raise exception 'Confirmed account required' using errcode='42501'; end if;
 if p_staff and not exists(select 1 from public.workspace_admins a join auth.users u on a.email=lower(u.email) where u.id=p_actor_id and a.active) then raise exception 'Staff access required' using errcode='42501'; end if;
 return jsonb_build_object('historyLimit',100,'messageLimit',100,
 'clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'full_name',c.full_name,'company',c.company) order by c.full_name) from public.clients c where c.archived_at is null and (p_staff or exists(select 1 from public.client_portal_memberships pm where pm.client_id=c.id and pm.user_id=p_actor_id and pm.active))),'[]'::jsonb),
 'requests',coalesce((select jsonb_agg(row_data order by updated_at desc,id) from (
 select r.updated_at,r.id,jsonb_build_object('id',r.id,'client_id',r.client_id,'project_id',r.project_id,'subject',r.subject,'description',r.description,'status',r.status,'created_at',r.created_at,'updated_at',r.updated_at,
 'client',jsonb_build_object('id',c.id,'full_name',c.full_name,'company',c.company),
 'project',case when p.id is not null then jsonb_build_object('id',p.id,'title',p.title) else null end,
 'message_count',(select count(*) from public.client_request_messages m where m.request_id=r.id),
 'messages',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'body',m.body,'author_role',m.author_role,'created_at',m.created_at) order by m.created_at,m.id) from (select * from public.client_request_messages where request_id=r.id order by created_at desc,id desc limit 100) m),'[]'::jsonb)) row_data
 from public.client_requests r join public.clients c on c.id=r.client_id left join public.projects p on p.id=r.project_id
 where c.archived_at is null and (p_staff or exists(select 1 from public.client_portal_memberships pm where pm.client_id=r.client_id and pm.user_id=p_actor_id and pm.active))
 order by r.updated_at desc,r.id limit 100) scoped),'[]'::jsonb));
end $$;

create function public.mutate_client_request(p_actor_id uuid,p_staff boolean,p_action text,p_payload jsonb) returns uuid
language plpgsql volatile security invoker set search_path='' as $$
declare v_request public.client_requests%rowtype; v_existing public.client_request_messages%rowtype; v_client uuid; v_project uuid; v_submission uuid; v_id uuid; v_subject text; v_text text; v_status text;
begin
 if p_staff is null then raise exception 'Access mode required' using errcode='22023'; end if;
 if not exists(select 1 from auth.users where id=p_actor_id and email_confirmed_at is not null) then raise exception 'Confirmed account required' using errcode='42501'; end if;
 if p_staff and not exists(select 1 from public.workspace_admins a join auth.users u on a.email=lower(u.email) where u.id=p_actor_id and a.active) then raise exception 'Staff access required' using errcode='42501'; end if;
 if p_action is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Invalid action' using errcode='22023'; end if;
 if p_action='create' and not p_staff then
  v_client:=(p_payload->>'clientId')::uuid; v_project:=nullif(p_payload->>'projectId','')::uuid;
  v_submission:=(p_payload->>'submissionId')::uuid; v_subject:=trim(p_payload->>'subject'); v_text:=trim(p_payload->>'description');
  if v_client is null or v_submission is null or v_subject is null or char_length(v_subject) not between 2 and 180 or v_text is null or char_length(v_text) not between 2 and 4000 then raise exception 'Invalid request' using errcode='22023'; end if;
  -- Lock membership and client rows until commit: a concurrent revocation/archive must wait.
  perform 1 from public.client_portal_memberships pm join public.clients c on c.id=pm.client_id where pm.user_id=p_actor_id and pm.client_id=v_client and pm.active and c.archived_at is null for share of pm,c;
  if not found then raise exception 'Request unavailable' using errcode='42501'; end if;
  if v_project is not null then
   perform 1 from public.projects where id=v_project and client_id=v_client for share;
   if not found then raise exception 'Project unavailable' using errcode='42501'; end if;
  end if;
  insert into public.client_requests(client_id,project_id,created_by,submission_id,subject,description) values(v_client,v_project,p_actor_id,v_submission,v_subject,v_text)
  on conflict(created_by,submission_id) do nothing returning id into v_id;
  if v_id is null then
   select * into v_request from public.client_requests where created_by=p_actor_id and submission_id=v_submission;
   if v_request.client_id is distinct from v_client or v_request.project_id is distinct from v_project or v_request.subject is distinct from v_subject or v_request.description is distinct from v_text then raise exception 'Submission already used for different content' using errcode='22023'; end if;
   v_id:=v_request.id;
  end if;
  return v_id;
 end if;
 if p_action not in ('reply','status') or (p_action='status' and not p_staff) then raise exception 'Unsupported action' using errcode='22023'; end if;
 v_id:=(p_payload->>'requestId')::uuid;
 -- Membership lock precedes request lock consistently with creation.
 select client_id into v_client from public.client_requests where id=v_id;
 if not p_staff then
  perform 1 from public.client_portal_memberships pm join public.clients c on c.id=pm.client_id where pm.user_id=p_actor_id and pm.client_id=v_client and pm.active and c.archived_at is null for share of pm,c;
  if not found then raise exception 'Request unavailable' using errcode='42501'; end if;
 else
  perform 1 from public.clients where id=v_client and archived_at is null for share;
  if not found then raise exception 'Request unavailable' using errcode='42501'; end if;
 end if;
 select * into v_request from public.client_requests where id=v_id for update;
 if not found then raise exception 'Request unavailable' using errcode='42501'; end if;
 if p_action='status' then
  v_status:=p_payload->>'status';
  if v_status is null or v_status not in ('open','in_progress','waiting_on_client','resolved') then raise exception 'Invalid status' using errcode='22023'; end if;
  update public.client_requests set status=v_status,updated_at=now() where id=v_id;
 else
  if v_request.status='resolved' then raise exception 'Reopen the request before replying' using errcode='22023'; end if;
  v_submission:=(p_payload->>'submissionId')::uuid; v_text:=trim(p_payload->>'body');
  if v_submission is null or v_text is null or char_length(v_text) not between 2 and 4000 then raise exception 'Invalid reply' using errcode='22023'; end if;
  insert into public.client_request_messages(request_id,author_id,author_role,submission_id,body) values(v_id,p_actor_id,case when p_staff then 'staff' else 'client' end,v_submission,v_text)
  on conflict(author_id,submission_id) do nothing returning * into v_existing;
  if v_existing.id is null then
   select * into v_existing from public.client_request_messages where author_id=p_actor_id and submission_id=v_submission;
   if v_existing.request_id is distinct from v_id or v_existing.body is distinct from v_text or v_existing.author_role is distinct from (case when p_staff then 'staff' else 'client' end) then raise exception 'Submission already used for different content' using errcode='22023'; end if;
  else
   -- Staff replies invite a client response; client replies return an open request to the queue.
   update public.client_requests set status=case when p_staff then 'waiting_on_client' else 'open' end,updated_at=now() where id=v_id;
  end if;
 end if;
 return v_id;
end $$;
revoke all on function public.list_client_requests(uuid,boolean),public.mutate_client_request(uuid,boolean,text,jsonb) from public,anon,authenticated;
grant execute on function public.list_client_requests(uuid,boolean),public.mutate_client_request(uuid,boolean,text,jsonb) to service_role;
commit;
