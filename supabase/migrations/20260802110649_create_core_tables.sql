-- Core schema for Agentic OS, table names and fields locked per docs/agentic-os-handoff.md §5.
-- owner_id (not user_id) on every table, per that same decision.

create table clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  upwork_url text,
  confidence_tier text not null default 'insufficient'
    check (confidence_tier in ('full', 'low', 'insufficient')),
  verdict text
    check (verdict in ('BID', 'NO-BID', 'MAYBE', 'New · Unverified')),
  price_band_min text,
  price_band_max text,
  price_band_low_confidence boolean not null default false,
  hires_count integer not null default 0,
  jobs_won integer not null default 0,
  jobs_lost integer not null default 0,
  reviews_visible boolean not null default false,
  spend_visible boolean not null default false,
  payment_verified boolean not null default false,
  last_analyzed_data_hash text,
  last_analyzed_at timestamptz,
  created_at timestamptz not null default now()
);

create table client_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  email text not null,
  name text
);

create table integrations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  category text not null
    check (category in ('repo', 'calendar')),
  provider text not null
    check (provider in ('github', 'gitlab', 'google_calendar')),
  status text not null default 'disconnected'
    check (status in ('connected', 'error', 'disconnected')),
  connected_at timestamptz,
  account_label text
);

create table repos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid not null references integrations(id) on delete cascade,
  provider text not null
    check (provider in ('github', 'gitlab', 'google_calendar')),
  full_name text not null,
  is_default boolean not null default false
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  title text not null,
  source text not null
    check (source in ('bot_recall', 'manual_paste', 'manual_upload')),
  transcript_source text
    check (transcript_source in ('caption', 'whisper_fallback', 'manual')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'processing', 'ready', 'failed')),
  recall_bot_id text,
  draft_tickets jsonb not null default '[]'::jsonb,
  starts_at timestamptz not null,
  known_client boolean not null default false,
  guest_email text
);

create table tickets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  repo_id uuid references repos(id) on delete set null,
  title text not null,
  plan_summary text,
  state text not null default 'backlog'
    check (state in (
      'backlog', 'in_progress', 'agent_running', 'awaiting_plan_approval',
      'executing', 'review', 'changes_requested', 'needs_human', 'done'
    )),
  pr_url text,
  attempt_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  ticket_id uuid not null references tickets(id) on delete cascade,
  attempt_number integer not null,
  files_touched_count integer not null default 0,
  token_cost integer not null default 0,
  created_at timestamptz not null default now()
);

create table proposals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  title text not null,
  state text not null default 'draft'
    check (state in ('draft', 'sent', 'won', 'lost')),
  in_voice boolean not null default false,
  body text not null default '',
  sent_at timestamptz,
  outcome_reason text
    check (outcome_reason in (
      'Price too high', 'Went with someone else', 'No response', 'Scope mismatch', 'Other',
      'Selected on merit', 'Referred / relationship', 'Price matched budget'
    )),
  created_at timestamptz not null default now()
);
