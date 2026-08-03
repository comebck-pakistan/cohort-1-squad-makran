-- M9: Bearer token so the Chrome extension (a separate origin, no session cookie) can call
-- the app's server-side LLM analysis endpoint without shipping OPENAI_API_KEY into the browser.
-- Same trust pattern as GITHUB_TOKEN/SKRIBBY_API_KEY: one long-lived secret, shown once.
create table extension_tokens (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

alter table extension_tokens enable row level security;

create policy "owner_all_extension_tokens" on extension_tokens
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select, insert, update, delete on extension_tokens to authenticated;
grant all on extension_tokens to service_role;
