create table emberweb_private.installation (
  workspace_id uuid primary key check (workspace_id = 'c5a1014d-1a15-4f29-acac-c7221799bdd3'),
  installed_at timestamptz not null default now()
);
insert into emberweb_private.installation(workspace_id) values ('c5a1014d-1a15-4f29-acac-c7221799bdd3');

grant execute on function emberweb.get_invoice_for_payment(text) to service_role;
revoke execute on function emberweb.get_invoice_for_payment(text) from anon;

notify pgrst, 'reload schema';
commit;
