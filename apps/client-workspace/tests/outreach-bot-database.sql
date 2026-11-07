-- Run as the database owner in the approved EmberWeb Supabase project only.
-- All fixture rows and temporary changes to campaign states are rolled back.
-- This script makes no network requests and sends no messages.
begin;
do $$ declare owner_id uuid; begin
  select id into owner_id from auth.users where lower(email)='joshmoodley01@gmail.com' limit 1;
  if owner_id is null then raise exception 'approved owner account missing'; end if;
  perform set_config('test.bot_owner',owner_id::text,true);
  if not (select relrowsecurity from pg_class where oid='public.outreach_bot_jobs'::regclass)
    or not (select relrowsecurity from pg_class where oid='public.outreach_bot_campaigns'::regclass) then raise exception 'RLS missing'; end if;
  if has_table_privilege('anon','public.outreach_bot_jobs','select') or has_table_privilege('anon','public.outreach_bot_campaigns','select') then raise exception 'anonymous read granted'; end if;
  if has_table_privilege('authenticated','public.outreach_bot_jobs','insert') or has_table_privilege('authenticated','public.outreach_bot_campaigns','update') then raise exception 'direct staff mutation granted'; end if;
  if has_table_privilege('service_role','public.outreach_bot_jobs','delete') or has_table_privilege('service_role','public.outreach_bot_campaigns','delete') then raise exception 'unnecessary service delete'; end if;
  if has_function_privilege('authenticated','public.claim_outreach_bot_job()','execute')
    or has_function_privilege('anon','public.import_outreach_bot_result(uuid)','execute')
    or has_function_privilege('authenticated','public.create_outreach_bot_campaign(text,text,text,text,integer,integer,jsonb,uuid)','execute') then raise exception 'command callable by client role'; end if;
end $$;
-- Isolate this rollback test from legitimate work without publishing any state.
select pg_advisory_xact_lock(hashtext('emberweb_outreach_bot'));
update public.outreach_bot_campaigns set status='paused' where status='active';
set local role service_role;
do $$
declare target_campaign uuid; suppressed_campaign uuid; claim public.outreach_bot_jobs%rowtype;
  directory_claim public.outreach_bot_jobs%rowtype; previous_token uuid; second_token uuid;
  imported_id uuid; imported_again uuid; was_imported boolean; outcome text; claimed_count integer;
begin
  target_campaign := public.create_outreach_bot_campaign('Rollback research validation','biosync','services','Internal',2,2,
    '[{"kind":"business","url":"https://bot-business-a.validation.invalid/"},{"kind":"directory","url":"https://bot-directory.validation.invalid/list/"}]',
    current_setting('test.bot_owner')::uuid);
  perform set_config('test.bot_campaign',target_campaign::text,true);
  begin
    perform public.create_outreach_bot_campaign('Duplicate source validation','emberweb','','',1,1,
      '[{"kind":"business","url":"https://www.bot-business-a.validation.invalid/"}]',current_setting('test.bot_owner')::uuid);
    raise exception 'duplicate active source accepted';
  exception when unique_violation then null; end;
  update public.outreach_bot_jobs set available_at=now()-interval '2 hours' where campaign_id=target_campaign and canonical_host='bot-business-a.validation.invalid';
  update public.outreach_bot_jobs set available_at=now()-interval '1 hour' where campaign_id=target_campaign and seed_kind='directory';
  select * into claim from public.claim_outreach_bot_job();
  if claim.campaign_id is distinct from target_campaign or claim.seed_kind <> 'business' or claim.attempts <> 1 then raise exception 'initial claim failed'; end if;
  previous_token := claim.lease_token;
  select * into directory_claim from public.claim_outreach_bot_job();
  if directory_claim.seed_kind <> 'directory' or directory_claim.id=claim.id then raise exception 'unexpired lease reclaimed'; end if;
  select count(*) into claimed_count from public.claim_outreach_bot_job();
  if claimed_count <> 0 then raise exception 'daily cap exceeded'; end if;
  outcome := public.finish_outreach_bot_job(claim.id,gen_random_uuid(),'completed','{"kind":"business","evidence":{"businessName":"Rollback Business"}}',null,'[]');
  if outcome <> 'lost_lease' then raise exception 'stale token accepted'; end if;
  outcome := public.finish_outreach_bot_job(claim.id,previous_token,'completed',
    '{"kind":"business","evidence":{"businessName":"Rollback Business","contacts":[{"kind":"email","value":"office@validation.invalid","sourceUrl":"https://bot-business-a.validation.invalid/","observedAt":"2026-10-18T00:00:00Z"},{"kind":"phone","value":"+27215550100","sourceUrl":"https://bot-business-a.validation.invalid/","observedAt":"2026-10-18T00:00:00Z"}]}}',null,'[]');
  if outcome <> 'completed' then raise exception 'current token completion failed'; end if;
  select r.prospect_id,r.imported into imported_id,was_imported from public.import_outreach_bot_result(claim.id) r;
  if imported_id is null or not was_imported then raise exception 'review import failed'; end if;
  if not exists(select 1 from public.outreach_prospects where id=imported_id and permission_status='unconfirmed' and permission_note='' and product_key='biosync' and email='office@validation.invalid') then raise exception 'unsafe import values'; end if;
  select r.prospect_id,r.imported into imported_again,was_imported from public.import_outreach_bot_result(claim.id) r;
  if imported_again is distinct from imported_id or was_imported then raise exception 'import not idempotent'; end if;
  insert into public.outreach_prospects(business_name,website,permission_status,archived_at)
    values('Rollback archived opt-out','https://www.bot-business-a.validation.invalid/','do_not_contact',now());
  if not public.outreach_bot_source_suppressed('https://bot-business-a.validation.invalid/') then raise exception 'archived opt-out ignored'; end if;
  begin
    perform * from public.import_outreach_bot_result(claim.id);
    raise exception 'opt-out imported';
  exception when invalid_parameter_value then null; end;
  if not public.set_outreach_bot_campaign_status(target_campaign,'paused') then raise exception 'pause failed'; end if;
  if not exists(select 1 from public.outreach_bot_jobs where id=directory_claim.id and status='queued' and lease_token is null and attempts=0) then raise exception 'pause did not invalidate lease'; end if;
  outcome := public.finish_outreach_bot_job(directory_claim.id,directory_claim.lease_token,'completed','{"kind":"directory"}',null,'[]');
  if outcome <> 'lost_lease' then raise exception 'paused worker published'; end if;
  if not public.set_outreach_bot_campaign_status(target_campaign,'active') then raise exception 'resume failed'; end if;
  if (select count(*) from public.claim_outreach_bot_job()) <> 0 then raise exception 'pause reset daily budget'; end if;
  update public.outreach_bot_campaigns set daily_run_date=(now() at time zone 'Africa/Johannesburg')::date-1 where id=target_campaign;
  select * into directory_claim from public.claim_outreach_bot_job();
  outcome := public.finish_outreach_bot_job(directory_claim.id,directory_claim.lease_token,'completed',
    '{"kind":"directory","discoveredUrls":["https://bot-business-c.validation.invalid/","https://bot-business-d.validation.invalid/"]}',null,
    '["https://bot-business-a.validation.invalid/","https://bot-business-c.validation.invalid/","https://bot-business-d.validation.invalid/"]');
  if outcome <> 'completed' then raise exception 'directory completion failed'; end if;
  if (select count(*) from public.outreach_bot_jobs j where j.campaign_id=target_campaign and seed_kind='business') <> 2 then raise exception 'business site cap failed'; end if;
  if exists(select 1 from public.outreach_bot_jobs j where j.campaign_id=target_campaign and canonical_host='bot-business-d.validation.invalid') then raise exception 'discovery exceeded cap'; end if;
  select * into claim from public.claim_outreach_bot_job();
  if claim.canonical_host <> 'bot-business-c.validation.invalid' then raise exception 'discovered business not queued'; end if;
  outcome := public.finish_outreach_bot_job(claim.id,claim.lease_token,'failed',null,'timeout','[]');
  if outcome <> 'queued' or not exists(select 1 from public.outreach_bot_jobs where id=claim.id and available_at>now() and attempts=1 and finished_at is null) then raise exception 'transient retry missing'; end if;
  update public.outreach_bot_campaigns set daily_run_date=(now() at time zone 'Africa/Johannesburg')::date-1 where id=target_campaign;
  update public.outreach_bot_jobs set available_at=now()-interval '1 minute' where id=claim.id;
  select * into claim from public.claim_outreach_bot_job();
  if claim.attempts <> 2 then raise exception 'retry claim failed'; end if;
  second_token := claim.lease_token;
  update public.outreach_bot_jobs set lease_expires_at=now()-interval '1 second' where id=claim.id;
  select * into claim from public.claim_outreach_bot_job();
  if claim.attempts <> 3 or claim.lease_token=second_token then raise exception 'expired lease recovery failed'; end if;
  if public.finish_outreach_bot_job(claim.id,second_token,'completed','{"kind":"business"}',null,'[]') <> 'lost_lease' then raise exception 'stale recovered token accepted'; end if;
  update public.outreach_bot_jobs set lease_expires_at=now()-interval '1 second' where id=claim.id;
  perform * from public.claim_outreach_bot_job();
  if not exists(select 1 from public.outreach_bot_jobs where id=claim.id and status='failed' and error_code='attempt_limit') then raise exception 'attempt limit not enforced'; end if;
  if not exists(select 1 from public.outreach_bot_campaigns where id=target_campaign and status='completed') then raise exception 'campaign did not complete'; end if;
  suppressed_campaign := public.create_outreach_bot_campaign('Publication opt-out validation','emberweb','','',1,1,
    '[{"kind":"business","url":"https://bot-business-e.validation.invalid/"}]',current_setting('test.bot_owner')::uuid);
  select * into claim from public.claim_outreach_bot_job();
  insert into public.outreach_prospects(business_name,website,permission_status,archived_at)
    values('Rollback late opt-out','https://bot-business-e.validation.invalid/','do_not_contact',now());
  outcome := public.finish_outreach_bot_job(claim.id,claim.lease_token,'completed','{"kind":"business","evidence":{}}',null,'[]');
  if outcome <> 'skipped' or not exists(select 1 from public.outreach_bot_jobs where id=claim.id and result is null and error_code='do_not_contact') then raise exception 'late opt-out published'; end if;
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"email":"joshmoodley01@gmail.com","role":"authenticated"}',true);
do $$ begin
  if (select count(*) from public.outreach_bot_campaigns where id=current_setting('test.bot_campaign')::uuid) <> 1 then raise exception 'admin campaign read failed'; end if;
  if (select count(*) from public.outreach_bot_jobs where campaign_id=current_setting('test.bot_campaign')::uuid) <> 3 then raise exception 'admin job read failed'; end if;
  begin perform * from public.claim_outreach_bot_job(); raise exception 'staff claim allowed'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims','{"email":"unapproved@validation.invalid","role":"authenticated"}',true);
do $$ begin
  if exists(select 1 from public.outreach_bot_campaigns) or exists(select 1 from public.outreach_bot_jobs) then raise exception 'unapproved read allowed'; end if;
end $$;
set local role anon;
do $$ begin
  begin perform * from public.outreach_bot_jobs; raise exception 'anonymous read allowed'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select true as outreach_bot_rls_leases_caps_pause_import_tests_passed;
