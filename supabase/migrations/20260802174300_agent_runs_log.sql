alter table agent_runs add column log jsonb not null default '[]'::jsonb;
