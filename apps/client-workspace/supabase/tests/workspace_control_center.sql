-- Run in the approved project only. All test users and changes roll back.
begin;
do $$
declare owner_id uuid; first_user uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); other_client uuid; seed uuid; project uuid; response jsonb; first_claim jsonb; sub uuid:=gen_random_uuid(); key_id uuid; before_count int;
begin
 select id into owner_id from auth.users where email='joshmoodley01@gmail.com';
 assert workspace_private.actor_role(owner_id)='super_admin','Owner role';
 assert not has_table_privilege('anon','public.project_seeds','select'),'No anonymous seed reads';
 assert not has_table_privilege('authenticated','public.project_seed_updates','select'),'No raw client/internal-note reads';
 response:=public.workspace_command(owner_id,jsonb_build_object('action','create','submissionId',sub,'title','Rollback-only project','contactName','Integration check','email','workspace-check@example.invalid','brief','Rollback-only project control checks.'));
 seed:=(response->>'seedId')::uuid;
 assert (select project_id is null from public.project_seeds where id=seed),'No project ID before allocation';
 assert public.workspace_command(owner_id,jsonb_build_object('action','create','submissionId',sub,'title','Rollback-only project','contactName','Integration check','email','workspace-check@example.invalid','brief','Rollback-only project control checks.'))=response,'Retry is idempotent';
 first_claim:=public.workspace_command(owner_id,jsonb_build_object('action','claim','submissionId',gen_random_uuid(),'seedId',seed));
 select project_id into project from public.project_seeds where id=seed;
 assert project is not null,'Allocation creates project ID';
 perform public.workspace_command(owner_id,jsonb_build_object('action','claim','submissionId',gen_random_uuid(),'seedId',seed));
 assert (select project_id=project from public.project_seeds where id=seed),'Allocation never regenerates project ID';
 begin
   perform public.workspace_command(owner_id,jsonb_build_object('action','stage','submissionId',gen_random_uuid(),'seedId',seed,'stage','building','progress',30,'version',1));
   raise exception 'Stale revision was accepted';
 exception when serialization_failure then null; end;
 insert into auth.users(id,email,email_confirmed_at,aud,role,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
 (first_user,first_user||'@example.invalid',now(),'authenticated','authenticated','{}','{}',now(),now()),
 (other_user,other_user||'@example.invalid',now(),'authenticated','authenticated','{}','{}',now(),now());
 insert into public.client_portal_memberships(client_id,user_id) select client_id,first_user from public.project_seeds where id=seed;
 insert into public.clients(full_name,email) values('Other rollback-only client','other-workspace-check@example.invalid') returning id into other_client;
 insert into public.client_portal_memberships(client_id,user_id) values(other_client,other_user);
 perform public.workspace_command(owner_id,jsonb_build_object('action','comment','submissionId',gen_random_uuid(),'seedId',seed,'body','Internal: a failed check requires further work.','clientSummary','The first review is ready.'));
 perform public.workspace_command(owner_id,jsonb_build_object('action','publish','submissionId',gen_random_uuid(),'seedId',seed,'updateId',(select id from public.project_seed_updates where seed_id=seed limit 1),'clientSummary','The first review is ready.'));
 response:=public.workspace_client_updates(first_user);
 assert jsonb_array_length(response)=1,'Own approved update is visible';
 assert response::text not like '%failed check%','Internal comments never leak';
 assert jsonb_array_length(public.workspace_client_updates(other_user))=0,'Other client sees no update';
 begin perform public.workspace_board(first_user); raise exception 'Client opened staff board'; exception when insufficient_privilege then null; end;
 begin perform public.workspace_super_report(first_user); raise exception 'Client opened audit'; exception when insufficient_privilege then null; end;
 key_id:=public.workspace_agent_key(owner_id,project,'Rollback-only agent',repeat('a',64));
 begin perform public.workspace_agent_access(gen_random_uuid(),repeat('a',64)); raise exception 'Agent crossed project'; exception when insufficient_privilege then null; end;
 before_count:=(select count(*) from public.project_seed_updates where seed_id=seed);
 sub:=gen_random_uuid();
 perform public.workspace_agent_access(project,repeat('a',64),jsonb_build_object('submissionId',sub,'body','Internal agent issue.','clientSummary','A draft progress update.'));
 perform public.workspace_agent_access(project,repeat('a',64),jsonb_build_object('submissionId',sub,'body','Internal agent issue.','clientSummary','A draft progress update.'));
 assert (select count(*)=before_count+1 from public.project_seed_updates where seed_id=seed),'Agent retries do not duplicate comments';
 assert jsonb_array_length(public.workspace_client_updates(first_user))=1,'Agent cannot auto-publish';
 update public.project_agent_keys set revoked_at=now() where id=key_id;
 begin perform public.workspace_agent_access(project,repeat('a',64)); raise exception 'Revoked agent accepted'; exception when insufficient_privilege then null; end;
 begin update public.workspace_audit set action='tampered' where id=(select max(id) from public.workspace_audit); raise exception 'Audit was mutable'; exception when insufficient_privilege then null; end;
 update public.client_portal_memberships set active=false where user_id=first_user;
 begin perform public.workspace_client_updates(first_user); raise exception 'Revoked client accepted'; exception when insufficient_privilege then null; end;
end $$;
rollback;
