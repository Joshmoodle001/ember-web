begin;
create function public.workspace_super_accounts(p_actor_id uuid,p_page integer default 0) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if workspace_private.actor_role(p_actor_id) is distinct from 'super_admin' then raise exception 'Super admin required' using errcode='42501'; end if;
 if p_page<0 or p_page>10000 then raise exception 'Invalid page' using errcode='22023'; end if;
 return jsonb_build_object('users',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'email',u.email,'name',coalesce(u.raw_user_meta_data->>'full_name',''),'phone',coalesce(u.raw_user_meta_data->>'contact_phone',''),'role',workspace_private.actor_role(u.id),'verified',u.email_confirmed_at is not null,'disabled',u.deleted_at is not null or u.banned_until>now(),'created_at',u.created_at,'last_sign_in_at',u.last_sign_in_at,'memberships',coalesce((select jsonb_agg(jsonb_build_object('clientId',m.client_id,'active',m.active,'company',coalesce(c.company,c.full_name))) from public.client_portal_memberships m join public.clients c on c.id=m.client_id where m.user_id=u.id),'[]'::jsonb))) from (select * from auth.users where deleted_at is null order by created_at desc limit 100 offset p_page*100) u),'[]'::jsonb),
 'total',(select count(*) from auth.users where deleted_at is null),'page',p_page,
 'clients',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',coalesce(c.company,c.full_name),'email',c.email)) from public.clients c where archived_at is null),'[]'::jsonb));
end $$;
revoke all on function public.workspace_super_accounts(uuid,integer) from public,anon,authenticated;
grant execute on function public.workspace_super_accounts(uuid,integer) to service_role;
-- Browser sessions can read assigned project data, but new IDs are issued by allocation only.
revoke insert on public.projects from authenticated;
commit;
