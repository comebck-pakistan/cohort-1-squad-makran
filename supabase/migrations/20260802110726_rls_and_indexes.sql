-- Owner-only RLS on every table (no team/workspace concept in v1.0, so this is
-- a straightforward per-row owner_id = auth.uid() check), plus indexes on
-- owner_id everywhere and on the confidence-tier / state-machine columns.

alter table clients enable row level security;
alter table client_contacts enable row level security;
alter table integrations enable row level security;
alter table repos enable row level security;
alter table meetings enable row level security;
alter table tickets enable row level security;
alter table agent_runs enable row level security;
alter table proposals enable row level security;

create policy "owner_all_clients" on clients
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all_client_contacts" on client_contacts
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all_integrations" on integrations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all_repos" on repos
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all_meetings" on meetings
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all_tickets" on tickets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all_agent_runs" on agent_runs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "owner_all_proposals" on proposals
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- owner_id indexes (Postgres does not auto-index FK columns)
create index idx_clients_owner_id on clients (owner_id);
create index idx_client_contacts_owner_id on client_contacts (owner_id);
create index idx_integrations_owner_id on integrations (owner_id);
create index idx_repos_owner_id on repos (owner_id);
create index idx_meetings_owner_id on meetings (owner_id);
create index idx_tickets_owner_id on tickets (owner_id);
create index idx_agent_runs_owner_id on agent_runs (owner_id);
create index idx_proposals_owner_id on proposals (owner_id);

-- state-machine / confidence-tier query columns
create index idx_tickets_state on tickets (state);
create index idx_proposals_state on proposals (state);
create index idx_meetings_status on meetings (status);
create index idx_clients_confidence_tier on clients (confidence_tier);

-- foreign-key join columns used across screens (client detail, meeting/ticket lists)
create index idx_client_contacts_client_id on client_contacts (client_id);
create index idx_repos_integration_id on repos (integration_id);
create index idx_meetings_client_id on meetings (client_id);
create index idx_tickets_client_id on tickets (client_id);
create index idx_tickets_repo_id on tickets (repo_id);
create index idx_agent_runs_ticket_id on agent_runs (ticket_id);
create index idx_proposals_client_id on proposals (client_id);
