-- Real GitHub OAuth (Authorization Code flow, app-owned, separate from Supabase Auth's
-- sign-in provider) needs somewhere to persist the per-user access token so lib/github.ts
-- can act on the user's behalf instead of a shared GITHUB_TOKEN env var.

alter table integrations add column access_token text;
