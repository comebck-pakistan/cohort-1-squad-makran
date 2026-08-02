# Environment variables (M2)

Not committed as `.env.local` (gitignored, permission-blocked for Claude Code to write directly). Create `.env.local` at repo root yourself with these keys:

```
# Local Supabase stack (values printed by `npx supabase status` after `npx supabase start`)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# OAuth apps, needed for Google/GitHub sign-in to work even locally.
# Google: console.cloud.google.com -> OAuth client, redirect URI http://127.0.0.1:54321/auth/v1/callback
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=
# GitHub: github.com/settings/developers -> OAuth App, callback URL http://127.0.0.1:54321/auth/v1/callback
SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=

# Proposal Drafter (M3): OpenAI used for both embeddings (text-embedding-3-small) and
# generation (gpt-4o-mini), platform.openai.com -> API keys. Server-side only, never exposed
# to the browser (read in lib/llm/embeddings.ts and lib/llm/proposal-drafter.ts).
OPENAI_API_KEY=
```

Until Google/GitHub client id + secret are filled in, those two sign-in buttons will error at redirect. OTP email sign-in works with none of this filled in beyond the Supabase URL/anon key, since local dev catches OTP emails at `http://127.0.0.1:54324` (Mailpit) instead of sending them.

**After every `npx supabase start` (or `stop` + `start`), also run:**
```
docker restart supabase_auth_cohort-1-squad-makran
```
Known CLI bug ([supabase/cli#4668](https://github.com/supabase/cli/issues/4668)): the auth container races Kong on startup and tries to fetch our custom OTP email template (`supabase/templates/magic_link.html`) before Kong has actually created it, so it silently fails and every sign-in/sign-up email comes through as a bare "click this link" with no visible code, useless against the app's 6-digit code input. Restarting auth once things are up makes it retry the fetch successfully. Google/GitHub OAuth are unaffected by this, only OTP email.

The Supabase CLI does not read `.env.local` either (see below) — always run `set -a; source .env.local; set +a;` before `npx supabase start`/`stop`, or the Google/GitHub client id/secret resolve to the literal string `env(...)` and those buttons fail.

`.claude/launch.json` also inlines `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` so the dev server works out of the box for the preview browser tool, no `.env.local` required. That anon key is Supabase's fixed local-dev demo JWT (same on every machine, derived from the fixed local `JWT_SECRET` in `supabase/config.toml`), not a real secret. Once `.env.local` exists it takes precedence for anything not covered by launch.json's inline vars (Google/GitHub OAuth creds).
