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

# M4: Skribby bot-join. Real account needed, no local/mock mode (swapped from Recall.ai on
# 2026-08-03, Recall.ai requires a business email to sign up). platform.skribby.io ->
# dashboard -> API Keys. SKRIBBY_WEBHOOK_SECRET is from Settings -> Webhook Settings, verified
# via HMAC-SHA256 in app/api/webhooks/skribby/route.ts.
SKRIBBY_API_KEY=
SKRIBBY_WEBHOOK_SECRET=

# M4: email delivery (pre-meeting briefings, notifications). Defaults to local Mailpit
# (127.0.0.1:54325, no auth) when unset, see the smtp_port note below. Set these for real
# Gmail SMTP: an App Password, not your normal Gmail password.
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# M5: Agent Runtime. Real per-user GitHub OAuth (Authorization Code flow, app-owned,
# separate from Supabase Auth's own sign-in provider). Create a GitHub OAuth App at
# github.com -> Settings -> Developer settings -> OAuth Apps, callback URL
# http://localhost:3000/api/github/oauth/callback (must match exactly, classic OAuth
# Apps only support one callback URL, so this can't be the same app used for
# "Sign in with GitHub" if that one is registered against Supabase's own callback).
GITHUB_OAUTH_CLIENT_ID=
GITHUB_OAUTH_CLIENT_SECRET=

# M5: 32-byte key (64 hex chars) used to encrypt the stored GitHub access token at rest
# (AES-256-GCM, lib/crypto.ts). Generate with: openssl rand -hex 32
INTEGRATION_TOKEN_ENCRYPTION_KEY=

# M11: Google Calendar meeting detection. Real per-user OAuth (Authorization Code flow,
# app-owned, separate from Supabase Auth's sign-in provider), reuses the same
# SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID/SECRET above rather than a second OAuth app,
# since a single Google Cloud OAuth client supports multiple redirect URIs and scopes.
# On console.cloud.google.com, on that same OAuth client: (1) enable the "Google Calendar
# API", (2) add four scopes under Data Access:
#       openid
#       https://www.googleapis.com/auth/userinfo.email      (labels the card with the account)
#       https://www.googleapis.com/auth/calendar.readonly   (sync + the week grid)
#       https://www.googleapis.com/auth/calendar.events     (Solvo creating the event + Meet link)
#     the last two are "sensitive" scopes, the first two are not,
# (3) add redirect URI http://localhost:3000/api/google-calendar/oauth/callback
#     (register the 127.0.0.1 spelling too if NEXT_PUBLIC_APP_URL uses it: Google matches the
#     string exactly, and localhost and 127.0.0.1 are different strings to it),
# (4) if the consent screen is in "Testing" status, add the account under Audience -> Test users
#     (an account that is not listed gets "Error 403: access_denied" after picking it).
# No new env vars needed. Changing the scope list means existing users must disconnect and
# reconnect: a grant issued before a scope was added does not gain it silently.
```

Until Google/GitHub client id + secret are filled in, those two sign-in buttons will error at redirect. OTP email sign-in works with none of this filled in beyond the Supabase URL/anon key, since local dev catches OTP emails at `http://127.0.0.1:54324` (Mailpit) instead of sending them.

**After every `npx supabase start` (or `stop` + `start`), also run:**
```
docker restart supabase_auth_cohort-1-squad-makran
```
Known CLI bug ([supabase/cli#4668](https://github.com/supabase/cli/issues/4668)): the auth container races Kong on startup and tries to fetch our custom OTP email template (`supabase/templates/magic_link.html`) before Kong has actually created it, so it silently fails and every sign-in/sign-up email comes through as a bare "click this link" with no visible code, useless against the app's 6-digit code input. Restarting auth once things are up makes it retry the fetch successfully. Google/GitHub OAuth are unaffected by this, only OTP email.

The Supabase CLI does not read `.env.local` either (see below), so always run `set -a; source .env.local; set +a;` before `npx supabase start`/`stop`, or the Google/GitHub client id/secret resolve to the literal string `env(...)` and those buttons fail.

`.claude/launch.json` also inlines `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` so the dev server works out of the box for the preview browser tool, no `.env.local` required. That anon key is Supabase's fixed local-dev demo JWT (same on every machine, derived from the fixed local `JWT_SECRET` in `supabase/config.toml`), not a real secret. Once `.env.local` exists it takes precedence for anything not covered by launch.json's inline vars (Google/GitHub OAuth creds).

## M4: Meetings pipeline

**Inngest (local dev, no account needed):** run `npx inngest-cli dev -u http://localhost:3000/api/inngest` alongside `npm run dev`. Its dashboard (usually `http://127.0.0.1:8288`) shows every event and function run, useful for debugging ticketize/briefing without digging through server logs.

**Local Mailpit SMTP for Nodemailer:** `supabase/config.toml`'s `[local_smtp]` section now sets `smtp_port = 54325` (was commented out) so Nodemailer on the host can reach the same local Mailpit that Supabase Auth already uses for OTP emails, no separate mail server needed for local dev. Briefing/notification emails land at `http://127.0.0.1:54324` alongside auth emails. Requires a full `supabase stop && supabase start` to pick up (config.toml changes, not `db reset`).

**Skribby is a hard external dependency, no local/mock substitute.** The bot-join path (`scheduleBotMeeting`, the Skribby webhook receiver) needs a real `SKRIBBY_API_KEY` and a real scheduled meeting to test end-to-end. Built against Skribby's documented REST API (`docs.skribby.io`): `POST /bot` to create, `GET /bot/{id}` for the finished transcript/recording, HMAC-SHA256-signed `status_update` webhooks. The manual-paste path (`createManualMeeting`) needs none of this.

**Swapped from Recall.ai to Skribby on 2026-08-03.** Recall.ai's signup form rejects personal email domains (requires a business email), which the account owner doesn't have. Skribby has no such wall, same bot-join-as-participant shape, no host permission or Zoom/Meet OAuth needed. `meetings.recall_bot_id` renamed to `skribby_bot_id`, `meetings.source`'s `'bot_recall'` enum value renamed to `'bot_skribby'` (migration `20260803100000_rename_recall_to_skribby.sql`). Webhook signing changed from Recall's Svix to Skribby's own HMAC-SHA256 scheme (`X-Skribby-Signature`/`X-Skribby-Timestamp` headers, 5-minute replay tolerance).

## M5: Agent Runtime

**GitHub auth is real per-user OAuth, added 2026-08-04 (originally deviated to a shared `GITHUB_TOKEN` PAT, see build-plan doc for that history).** App-owned Authorization Code flow (`app/api/github/oauth/start`, `app/api/github/oauth/callback`), independent of Supabase Auth's own "Sign in with GitHub" provider, since Supabase's `signInWithOAuth` doesn't request `repo` scope and doesn't durably persist `provider_token` past the callback, and reusing it for repo-level access would require identity-linking machinery this app doesn't have. Settings -> Integrations' "Connect with GitHub" button redirects to GitHub with `repo workflow` scope, the callback exchanges the code for an access token, looks up the authenticated login, and upserts it (AES-256-GCM encrypted, `lib/crypto.ts`) into `integrations.access_token`. `lib/github.ts`'s functions all take the token as an explicit first argument now, no module-level env read. `connectRepo()` and `agent-run.ts` both fetch the signed-in owner's decrypted token from the DB before calling GitHub; a ticket with no connected token goes straight to `needs_human`.

**A real GitHub repo is required to test the loop at all**, since there's no local/mock GitHub. Connect via Settings -> Integrations (needs `GITHUB_OAUTH_CLIENT_ID`/`SECRET` set and the OAuth flow completed first). For the retry-cap exit criterion (needs_human after 3 failed attempts), that repo needs a GitHub Actions workflow that always fails on `pull_request`, since the agent has no visibility into the repo's actual file contents and can't reliably "fix" a real bug, only regenerate its guess each attempt.

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

## M9: Explain the Client

No new hard external dependency, real client analysis reuses `OPENAI_API_KEY` from M3.

**Extension → backend auth:** the Chrome extension is a separate origin with no session cookie, and can't safely embed `OPENAI_API_KEY`, so it authenticates to `/api/extension/analyze-client` with a Bearer token instead. Generate one in the running app at Settings → Integrations → "Browser extension" → Generate token (shown once, copy it), then paste it into the extension popup's sign-in screen. Stored in `extension_tokens` (owner_id, token), same trust level as the GitHub OAuth token, generating a new one invalidates the old.

**Extension's own app URL:** `extension/src/lib/api.ts` defaults to `http://localhost:3000`. No `.env` file in `extension/` (same permission wall as the main app's `.env.local`), override via `PLASMO_PUBLIC_APP_URL` in your shell if needed.

**Real, unavoidable data gap:** Upwork does not expose a client's average rate paid, or any client identity (name, company, profile link) to a non-applicant viewer, logged in or out, confirmed empirically against real job pages. Price bands are only ever derived from the job's own posted budget and the freelancer's own rate history (Settings → Rate history, wired to real data this milestone too), never a fabricated per-client number.
