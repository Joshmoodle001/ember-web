-- Run against approved project only, after migration; all synthetic rows roll back.
begin;
insert into auth.users(id,email,email_confirmed_at) values
('11111111-1111-4111-8111-111111111111','portal-fixture-a@example.invalid',now()),
('22222222-2222-4222-8222-222222222222','portal-fixture-b@example.invalid',now());
insert into public.clients(id,full_name,email) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Portal Fixture A','portal-fixture-a@example.invalid'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Portal Fixture B','portal-fixture-b@example.invalid');
insert into public.client_portal_memberships(client_id,user_id) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222');
insert into public.projects(id,client_id,title,summary) values
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Published project A','INTERNAL_SECRET_DO_NOT_EXPOSE');
insert into public.invoices(client_id,invoice_number,description,amount_cents,status) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','PORTAL-ROLLBACK-DRAFT','Hidden draft',500,'draft');
set local role service_role;
do $$ declare result jsonb; begin
 result:=public.get_client_account('11111111-1111-4111-8111-111111111111');
 if jsonb_array_length(result)<>1 or result->0->'client'->>'id'<>'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' then raise exception 'membership isolation failed'; end if;
 if result::text like '%INTERNAL_SECRET%' or result::text like '%PORTAL-ROLLBACK-DRAFT%' or result::text like '%bbbbbbbb-bbbb%' then raise exception 'private data leaked'; end if;
 if public.get_client_account('33333333-3333-4333-8333-333333333333') <> '[]'::jsonb then raise exception 'unlinked account leaked'; end if;
end $$;
reset role;
update public.client_portal_memberships set active=false where user_id='11111111-1111-4111-8111-111111111111';
set local role service_role;
do $$ begin if public.get_client_account('11111111-1111-4111-8111-111111111111')<>'[]'::jsonb then raise exception 'revocation failed'; end if; end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"22222222-2222-4222-8222-222222222222","email":"portal-fixture-b@example.invalid","role":"authenticated"}',true);
do $$ begin
 if exists(select 1 from public.clients) or exists(select 1 from public.projects) or exists(select 1 from public.invoices) then raise exception 'raw staff records leaked'; end if;
 if has_function_privilege('authenticated','public.get_client_account(uuid)','EXECUTE') then raise exception 'customer can choose rpc user id'; end if;
 if (select count(*) from public.client_portal_memberships)<>1 then raise exception 'membership list isolation failed'; end if;
 begin
 insert into public.client_portal_memberships(client_id,user_id) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222');
 raise exception 'self grant allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
