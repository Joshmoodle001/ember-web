-- Exact EmberWeb project only. All synthetic users, clients and requests roll back.
begin;
insert into auth.users(id,email,email_confirmed_at) values
('11111111-1111-4111-8111-111111111131','request-a@example.invalid',now()),
('22222222-2222-4222-8222-222222222232','request-b@example.invalid',now()),
('33333333-3333-4333-8333-333333333333','request-staff@example.invalid',now());
insert into public.workspace_admins(email) values('request-staff@example.invalid');
insert into public.clients(id,full_name,email) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31','Request Fixture A','request-a@example.invalid'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb32','Request Fixture B','request-b@example.invalid');
insert into public.client_portal_memberships(client_id,user_id) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31','11111111-1111-4111-8111-111111111131'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb32','22222222-2222-4222-8222-222222222232');
insert into public.projects(id,client_id,title,summary) values
('cccccccc-cccc-4ccc-8ccc-cccccccccc31','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31','Request project A','PRIVATE_DELIVERY_CONTEXT'),
('dddddddd-dddd-4ddd-8ddd-dddddddddd32','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb32','Request project B','PRIVATE_OTHER_CONTEXT');
set local role service_role;
do $$ declare rid uuid; repeat_id uuid; listing jsonb; begin
 rid:=public.mutate_client_request('11111111-1111-4111-8111-111111111131',false,'create','{"clientId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31","projectId":"cccccccc-cccc-4ccc-8ccc-cccccccccc31","subject":"Please update homepage","description":"Add our new opening hours.","submissionId":"11111111-aaaa-4111-8111-111111111131"}');
 repeat_id:=public.mutate_client_request('11111111-1111-4111-8111-111111111131',false,'create','{"clientId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31","projectId":"cccccccc-cccc-4ccc-8ccc-cccccccccc31","subject":"Please update homepage","description":"Add our new opening hours.","submissionId":"11111111-aaaa-4111-8111-111111111131"}');
 if rid<>repeat_id or (select count(*) from public.client_requests where created_by='11111111-1111-4111-8111-111111111131')<>1 then raise exception 'Create idempotency failed'; end if;
 listing:=public.list_client_requests('11111111-1111-4111-8111-111111111131',false);
 if jsonb_array_length(listing->'requests')<>1 or listing::text like '%PRIVATE_%' then raise exception 'Client projection failed'; end if;
 if jsonb_array_length(public.list_client_requests('22222222-2222-4222-8222-222222222232',false)->'requests')<>0 then raise exception 'Cross-client list leaked'; end if;
 begin
 perform public.mutate_client_request('22222222-2222-4222-8222-222222222232',false,'reply',jsonb_build_object('requestId',rid,'body','Unauthorized reply','submissionId','22222222-aaaa-4222-8222-222222222232'));
 raise exception 'Cross-client reply allowed'; exception when insufficient_privilege then null; end;
 begin
 perform public.mutate_client_request('11111111-1111-4111-8111-111111111131',false,'create','{"clientId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31","projectId":"dddddddd-dddd-4ddd-8ddd-dddddddddd32","subject":"Wrong project","description":"This must be denied.","submissionId":"11111111-bbbb-4111-8111-111111111131"}');
 raise exception 'Cross-client project allowed'; exception when insufficient_privilege then null; end;
 begin
 perform public.mutate_client_request('11111111-1111-4111-8111-111111111131',false,'status',jsonb_build_object('requestId',rid,'status','resolved'));
 raise exception 'Client changed status'; exception when invalid_parameter_value then null; end;
 begin
 perform public.list_client_requests('11111111-1111-4111-8111-111111111131',true);
 raise exception 'Client impersonated staff'; exception when insufficient_privilege then null; end;
 begin
 perform public.list_client_requests('11111111-1111-4111-8111-111111111131',null);
 raise exception 'NULL list mode allowed'; exception when invalid_parameter_value then null; end;
 begin
 perform public.mutate_client_request('11111111-1111-4111-8111-111111111131',null,'reply',jsonb_build_object('requestId',rid,'body','Null mode attempt','submissionId','11111111-cccc-4111-8111-111111111131'));
 raise exception 'NULL mutation mode allowed'; exception when invalid_parameter_value then null; end;
 perform public.mutate_client_request('33333333-3333-4333-8333-333333333333',true,'reply',jsonb_build_object('requestId',rid,'body','We can arrange that update.','submissionId','33333333-aaaa-4333-8333-333333333333'));
 perform public.mutate_client_request('33333333-3333-4333-8333-333333333333',true,'reply',jsonb_build_object('requestId',rid,'body','We can arrange that update.','submissionId','33333333-aaaa-4333-8333-333333333333'));
 if (select count(*) from public.client_request_messages where request_id=rid)<>1 then raise exception 'Reply idempotency failed'; end if;
 if (select status from public.client_requests where id=rid)<>'waiting_on_client' then raise exception 'Reply status transition failed'; end if;
 begin
 perform public.mutate_client_request('33333333-3333-4333-8333-333333333333',true,'reply',jsonb_build_object('requestId',rid,'body','Changed reply same reference','submissionId','33333333-aaaa-4333-8333-333333333333'));
 raise exception 'Changed idempotent reply accepted'; exception when invalid_parameter_value then null; end;
 perform public.mutate_client_request('33333333-3333-4333-8333-333333333333',true,'status',jsonb_build_object('requestId',rid,'status','resolved'));
 begin
 perform public.mutate_client_request('11111111-1111-4111-8111-111111111131',false,'reply',jsonb_build_object('requestId',rid,'body','Reply on resolved','submissionId','11111111-dddd-4111-8111-111111111131'));
 raise exception 'Resolved reply accepted'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
update public.client_portal_memberships set active=false where user_id='11111111-1111-4111-8111-111111111131';
set local role service_role;
do $$ begin
 if jsonb_array_length(public.list_client_requests('11111111-1111-4111-8111-111111111131',false)->'requests')<>0 then raise exception 'Revoked member sees requests'; end if;
 begin
 perform public.mutate_client_request('11111111-1111-4111-8111-111111111131',false,'create','{"clientId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31","subject":"Revoked member","description":"Must fail.","submissionId":"11111111-eeee-4111-8111-111111111131"}');
 raise exception 'Revoked member wrote'; exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.client_portal_memberships set active=true where user_id='11111111-1111-4111-8111-111111111131';
update public.clients set archived_at=now() where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31';
set local role service_role;
do $$ begin
 if jsonb_array_length(public.list_client_requests('11111111-1111-4111-8111-111111111131',false)->'requests')<>0 then raise exception 'Archived client visible'; end if;
 begin
 perform public.mutate_client_request('11111111-1111-4111-8111-111111111131',false,'create','{"clientId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa31","subject":"Archived client","description":"Must fail.","submissionId":"11111111-ffff-4111-8111-111111111131"}');
 raise exception 'Archived client wrote'; exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222232","email":"request-b@example.invalid","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.client_requests) or exists(select 1 from public.client_request_messages) then raise exception 'Raw request records leaked'; end if;
 if has_function_privilege('authenticated','public.list_client_requests(uuid,boolean)','EXECUTE') or has_function_privilege('authenticated','public.mutate_client_request(uuid,boolean,text,jsonb)','EXECUTE') then raise exception 'Client can select actor on privileged RPC'; end if;
end $$;
reset role;
rollback;
