alter table repos add column client_id uuid references clients(id) on delete set null;
create index idx_repos_client_id on repos(client_id) where client_id is not null;

alter table tickets add column failure_reason text;
alter table meetings add column failure_reason text;
