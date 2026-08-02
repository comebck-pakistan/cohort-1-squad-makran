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

# OpenAI: embeddings (text-embedding-3-small, M3), generation (gpt-5-nano, M3+M4 ticketize),
# transcription (whisper-1, M4 fallback). platform.openai.com -> API keys. Server-side only.
OPENAI_API_KEY=

# M4: service-role client for Inngest functions/webhooks running outside a user session
# (bypasses RLS, admin-level). From `npx supabase status` (SERVICE_ROLE_KEY, the JWT one).
SUPABASE_SERVICE_ROLE_KEY=

# M4: Recall.ai bot-join + calendar integration. Real account needed, no local/mock mode.
# recall.ai -> API keys. RECALL_WEBHOOK_SECRET is the Svix signing secret from the webhook's
# settings page, verified in app/api/webhooks/recall/route.ts.
RECALL_API_KEY=
RECALL_WEBHOOK_SECRET=

# M4: email delivery (pre-meeting briefings, notifications). Defaults to local Mailpit
# (127.0.0.1:54325, no auth) when unset, see the smtp_port note below. Set these for real
# Gmail SMTP: an App Password, not your normal Gmail password.
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

Until Google/GitHub client id + secret are filled in, those two sign-in buttons will error at redirect. OTP email sign-in works with none of this filled in beyond the Supabase URL/anon key, since local dev catches OTP emails at `http://127.0.0.1:54324` (Mailpit) instead of sending them.

**After every `npx supabase start` (or `stop` + `start`), also run:**
```
docker restart supabase_auth_cohort-1-squad-makran
```
Known CLI bug ([supabase/cli#4668](https://github.com/supabase/cli/issues/4668)): the auth container races Kong on startup and tries to fetch our custom OTP email template (`supabase/templates/magic_link.html`) before Kong has actually created it, so it silently fails and every sign-in/sign-up email comes through as a bare "click this link" with no visible code, useless against the app's 6-digit code input. Restarting auth once things are up makes it retry the fetch successfully. Google/GitHub OAuth are unaffected by this, only OTP email.

The Supabase CLI does not read `.env.local` either (see below) — always run `set -a; source .env.local; set +a;` before `npx supabase start`/`stop`, or the Google/GitHub client id/secret resolve to the literal string `env(...)` and those buttons fail.

`.claude/launch.json` also inlines `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` so the dev server works out of the box for the preview browser tool, no `.env.local` required. That anon key is Supabase's fixed local-dev demo JWT (same on every machine, derived from the fixed local `JWT_SECRET` in `supabase/config.toml`), not a real secret. Once `.env.local` exists it takes precedence for anything not covered by launch.json's inline vars (Google/GitHub OAuth creds).

## M4: Meetings pipeline

**Inngest (local dev, no account needed):** run `npx inngest-cli dev -u http://localhost:3000/api/inngest` alongside `npm run dev`. Its dashboard (usually `http://127.0.0.1:8288`) shows every event and function run, useful for debugging ticketize/briefing without digging through server logs.

**Local Mailpit SMTP for Nodemailer:** `supabase/config.toml`'s `[local_smtp]` section now sets `smtp_port = 54325` (was commented out) so Nodemailer on the host can reach the same local Mailpit that Supabase Auth already uses for OTP emails, no separate mail server needed for local dev. Briefing/notification emails land at `http://127.0.0.1:54324` alongside auth emails. Requires a full `supabase stop && supabase start` to pick up (config.toml changes, not `db reset`).

**Recall.ai is a hard external dependency, no local/mock substitute.** The bot-join path (`scheduleBotMeeting`, the Recall webhook receiver) needs a real `RECALL_API_KEY` and a real scheduled meeting to test end-to-end; it was built against Recall's documented API conventions but is unverified against a live account. The manual-paste path (`createManualMeeting`) needs none of this and is what's actually been verified locally.
