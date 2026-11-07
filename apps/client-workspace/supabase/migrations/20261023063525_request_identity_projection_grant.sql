-- Exact EmberWeb project hbdxhbwufgkrwqxpieds only.
-- Service-only request RPCs verify the actor's confirmed identity and staff email.
-- Column-level access deliberately excludes passwords, token hashes and metadata.
begin;
grant select(id,email,email_confirmed_at) on auth.users to service_role;
commit;
