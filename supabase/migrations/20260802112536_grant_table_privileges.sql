-- Newer Supabase projects no longer auto-expose new public-schema tables to
-- the Data API roles; RLS policies alone are not enough, table-level grants
-- are a separate prerequisite. Access is still fully gated by the owner-only
-- RLS policies from the previous migration.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on
  public.clients,
  public.client_contacts,
  public.integrations,
  public.repos,
  public.meetings,
  public.tickets,
  public.agent_runs,
  public.proposals
to authenticated, service_role;
