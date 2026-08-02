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

# M5: Agent Runtime. Personal access token (classic, scopes: repo + workflow), not OAuth
# (deviation, see M5 section below). github.com -> Settings -> Developer settings ->
# Personal access tokens. Used server-side only, for branch/commit/PR/check-run API calls.
GITHUB_TOKEN=
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

## M5: Agent Runtime

**GitHub auth deviates from the handoff's "OAuth (not GitHub App)" pick.** No token-persistence infra exists for OAuth provider tokens (Supabase Auth's GitHub sign-in doesn't request `repo` scope and doesn't durably store `provider_token` past the callback), so building real OAuth-to-repo-token plumbing was out of scope for this milestone. `GITHUB_TOKEN` (a classic PAT, scopes `repo` + `workflow`) is used instead, same external-hard-dependency pattern as `RECALL_API_KEY`. Settings -> Integrations' "Connect repo" now does a real API call (verifies the repo exists and the token can see it, then saves a `repos` row) but there's no repo picker, you type `owner/repo` directly.

**A real GitHub repo is required to test the loop at all**, since there's no local/mock GitHub. Connect one via Settings -> Integrations (needs `GITHUB_TOKEN` set first). For the retry-cap exit criterion (needs_human after 3 failed attempts), that repo needs a GitHub Actions workflow that always fails on `pull_request`, since the agent has no visibility into the repo's actual file contents and can't reliably "fix" a real bug, only regenerate its guess each attempt.

**CI status gates the execute step.** `getCheckStatus()` polls `GET /repos/{repo}/commits/{ref}/check-runs` every 20s (up to 5 min) after each commit; a repo with no CI configured at all is treated as an immediate pass (nothing to block on), so the happy-path exit criterion works without requiring you to author a workflow file, only the retry-cap criterion does.

**`agent_runs.token_cost` is an integer column (locked schema), storing cents, not dollars.** The M1 mock data used decimal dollar values directly (a pre-existing inconsistency with the integer column type, not introduced this milestone); real writes now store `Math.round(dollarCost * 100)` and the UI divides by 100 at render time.

## M7: Notifications

**Optional, only affects links inside notification emails:**
```
# M7: base URL used to build ticket links in notification emails. Defaults to
# http://localhost:3000 for local dev if unset.
NEXT_PUBLIC_APP_URL=
```

Everything else needed for M7 (SMTP delivery) is already covered by M4's `SMTP_*` vars above, defaulting to local Mailpit. No new hard external dependency.

**Preferences are stored on `auth.users.user_metadata.notification_prefs`**, same pattern as M3's voice-profile survey answers: a per-user singleton, no new table. See `lib/notifications.ts` for the shape and defaults.

**In-app delivery is not built.** The per-trigger "In-app" toggles on Settings, Notifications are real (saved to and loaded from `user_metadata`), but there's no notification-center screen to actually deliver to, none of the 18 designed screens is one. Only email delivery (via `lib/mail.ts`, Nodemailer/Gmail SMTP, same as M4's briefing emails) is real.
