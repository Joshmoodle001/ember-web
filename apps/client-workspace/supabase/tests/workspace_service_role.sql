-- Exercise the actual server runtime role, not a postgres-owned function context.
begin;
do $$ declare u uuid:=gen_random_uuid(); c uuid; begin
 perform set_config('test.owner','6a916150-36dc-40c8-af1a-191e805a9567',true);
 insert into auth.users(id,email,email_confirmed_at,aud,role,created_at,updated_at) values(u,u||'@example.invalid',now(),'authenticated','authenticated',now(),now());
 insert into public.clients(full_name,email) values('Rollback-only runtime check',u||'@example.invalid') returning id into c;
 insert into public.client_portal_memberships(client_id,user_id) values(c,u);
 perform set_config('test.client_user',u::text,true);perform set_config('test.client',c::text,true);
end $$;
set local role service_role;
do $$
declare owner_id uuid:=current_setting('test.owner')::uuid; client_user uuid:=current_setting('test.client_user')::uuid; client_id uuid:=current_setting('test.client')::uuid;
 s jsonb; sid uuid; pid uuid; r jsonb; run_id uuid; l jsonb; sub uuid:=gen_random_uuid();
begin
 assert public.workspace_identity(owner_id)->>'role'='super_admin';
 perform public.workspace_board(owner_id);perform public.workspace_super_accounts(owner_id);perform public.workspace_super_report(owner_id);
 s:=public.workspace_command(owner_id,jsonb_build_object('action','create','submissionId',gen_random_uuid(),'title','Runtime rollback check','contactName','Integration check','email','runtime@example.invalid','brief','No permanent test records.','clientId',client_id));sid:=(s->>'seedId')::uuid;
 perform public.workspace_command(owner_id,jsonb_build_object('action','claim','submissionId',gen_random_uuid(),'seedId',sid));
 select project_id into pid from public.project_seeds where id=sid;assert pid is not null;
 perform public.workspace_card(owner_id,sid);perform public.workspace_client_updates(client_user);
 perform public.list_client_requests(client_user,false);
 perform public.mutate_client_request(client_user,false,'create',jsonb_build_object('clientId',client_id,'projectId',pid,'subject','Runtime check','description','Rollback-only ticket','submissionId',gen_random_uuid()));
 r:=public.workspace_lead_research(owner_id,'begin',jsonb_build_object('mode','search','input','Rollback-only search','submissionId',sub));run_id:=(r->'run'->>'id')::uuid;assert (r->>'started')::boolean;
 assert not (public.workspace_lead_research(owner_id,'begin',jsonb_build_object('mode','search','input','Rollback-only search','submissionId',sub))->>'started')::boolean;
 perform public.workspace_lead_research(owner_id,'finish',jsonb_build_object('runId',run_id,'results',jsonb_build_array(jsonb_build_object('name','Rollback company','website','https://business.co.za/','sourceUrl','https://business.co.za/','summary','Rollback-only result')),'elapsedMs',1));
 l:=public.workspace_lead_research(owner_id,'save',jsonb_build_object('runId',run_id,'index',0));
 r:=public.workspace_lead_research(owner_id,'save',jsonb_build_object('runId',run_id,'index',0));assert r->>'id'=l->>'id';
 r:=public.workspace_lead_research(owner_id,'promote',jsonb_build_object('leadId',l->>'id','submissionId',gen_random_uuid(),'title','Lead runtime check','contactName','Integration check','email','lead-runtime@example.invalid','brief','Agreed test scope, rolled back.'));
 assert r->>'seedId' is not null;
 assert(select seed_id is not null from public.research_leads where id=(l->>'id')::uuid);
 assert(select project_id is null from public.project_seeds where id=(r->>'seedId')::uuid);
 begin perform public.workspace_lead_research(client_user,'list');raise exception 'Client accessed lead research';exception when insufficient_privilege then null;end;
 assert not has_table_privilege('authenticated','public.research_leads','select');
end $$;
rollback;
