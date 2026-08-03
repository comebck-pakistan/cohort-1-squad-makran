# PENDING

Status as of 2026-08-04. Goal: deploy in 2 days, user runs the complete flow themself from the UI on real accounts (real GitHub repo, real Upwork account, real Gmail).

Build (M0-M9) is code-complete. What's left is: (1) things never built, (2) things built but never run against real infra/real accounts.

---

## 1. Not yet built

- **Responsiveness / mobile-friendly UI.** Zero `sm:`/`md:`/`lg:` breakpoint classes anywhere in `features/`, `components/`, `app/` (checked, 69 tsx files, 0 hits). App is desktop-only right now. Needs a pass if it'll be opened on a phone/tablet, or at minimum a narrow-desktop-window check.
- **Production deployment infra.** Everything so far ran against local Supabase (`npx supabase start`, Docker) and local dev server. Nothing is deployed. Needed before day 2:
  - Hosted Supabase project (or self-host), migrations applied there, RLS re-verified against it (not just local).
  - Vercel project (or wherever this deploys), production env vars set (see `docs/env-vars.md` for the full list: Supabase URL/keys, Google/GitHub sign-in OAuth, `GITHUB_OAUTH_CLIENT_ID/SECRET` for repo-connect, `OPENAI_API_KEY`, `SKRIBBY_API_KEY/WEBHOOK_SECRET`, `SMTP_*`, `INTEGRATION_TOKEN_ENCRYPTION_KEY`).
  - Every OAuth app (Google sign-in, GitHub sign-in, GitHub repo-connect) needs its callback URL re-registered for the production domain, current callbacks are all `127.0.0.1`/`localhost`.
  - Inngest needs a real account + signing key for prod (local dev used `isDev: true`, no signing key).
- **Hardening pass (M10).** Not started. Covers real failure-mode states across M2-M9: webhook failures, GitHub OAuth error mid-flow, Whisper fallback failure, rate-limit handling on OpenAI/GitHub APIs, basic monitoring/alerting on `needs_human` pileup.
- **"Communication style" block in pre-meeting briefing.** Open question, never decided: LLM-generated-and-cached at analysis time, or a user-editable notes field.

---

## 2. TESTING

### Verified

Real, live, end-to-end, not just typecheck/build:

- **Auth:** OTP email, Google OAuth, GitHub OAuth (sign-in) all confirmed real login through to `/home`, real session, against local Supabase.
- **RLS:** all 8 tables round-trip correctly for the owning user, zero rows / blocked writes for a second user (`scripts/rls-test.mjs`).
- **Proposal Drafter:** real OpenAI embeddings + generation, in-voice mode with real corpus, survey-fallback mode, Copy & Mark Sent transition, all against real DB.
- **Meetings, manual-paste path:** real ticketization (`gpt-5-nano`), human-confirm promotion into real `tickets` rows, real pre-meeting briefing email (to Mailpit).
- **Meetings, Skribby bot-join path:** a real bot joined a real live Google Meet call, produced a real transcript + recording URL, correctly ticketized. Webhook signature verification proven with synthetic signed payloads. Not proven: a real webhook actually delivered from Skribby's cloud to this app (needs a public URL/tunnel, `localhost:3000` isn't reachable from their side).
- **GitHub OAuth (repo-connect):** real "Connect with GitHub" flow, real token exchange, real encrypted storage, real repo picker (`GET /user/repos`, ~65 real repos), real repo connected as default.
- **Insights Dashboard:** hand-seeded real proposals, every stat/breakdown/chart matched hand computation.
- **Notifications:** staged real events against local Inngest + Mailpit, all 3 triggers (PR-ready, needs_human, every-change) plus opt-in gating and the briefing regression check, all confirmed correct.
- **Chrome extension, mock-data UI:** all 9 popup states (signed-out, loading, not-on-job, client full/low/insufficient, proposal in-voice/survey-fallback, insights) rendered correctly against the design mocks, served over plain local HTTP (not loaded as an actual unpacked extension).
- **Explain the Client (real Upwork data):** scraper run against real, live, logged-out Upwork job pages, correct extraction. Backend (tier calc, LLM verdict, price band, caching, auth) driven via curl with real scraped payloads, confirmed against DB. Not run through the actual popup as a loaded extension.
- **Real Gmail SMTP.** 2026-08-04: `SMTP_HOST/PORT/USER/PASS/FROM` set for real Gmail (App Password), `lib/mail.ts`'s `secure` flag fixed to key off port 465 vs 587. A real send through `sendEmail()` (the actual app code path, hit via a temp route then deleted) resolved with no error against `smtp.gmail.com`, landed in the real `SMTP_USER` inbox.
- **App renamed to Solvo.** 2026-08-04: "Agentic OS" was a working title, not a real product name. Renamed everywhere: web app brand text (nav, auth shell, onboarding header, landing page, `<title>`), Chrome extension (`package.json` name/displayName, popup logo, all copy), email sender (`Solvo <notifications@solvo.dev>`), git commit author (`Solvo Agent <agent@solvo.dev>` in `lib/github.ts`), Skribby bot display name, Inngest app id, root/extension `package.json` names, both docs (`agentic-os-build-plan.md`, `agentic-os-handoff.md`, `features.md`, doc filenames left as-is). Verified via a repo-wide grep after the pass, zero remaining "Agentic OS"/"agentcos.dev" hits outside filename slugs; `tsc --noEmit` clean on both the web app and extension.
- **Extension icon.** 2026-08-04: replaced the placeholder (colored square + white "A") with a real Solvo mark: rounded square, solid `--signal` brand blue with a subtle top-light glow, geometric white "S" (URW Gothic) with a tight drop shadow for legibility down to 16px, generated via ImageMagick straight into `extension/assets/icon.png` (same 512×512 source Plasmo auto-generates all MV3 sizes from, no manifest changes needed). Checked legible at 128/32/16px before finalizing.
- **Outcome Capture modal's notes/date fields.** 2026-08-04: added `proposals.outcome_notes` column (migration, RLS unaffected, existing owner policy covers it). `markProposalOutcome` now takes notes + a resolved date, `OutcomeCaptureModal`'s date input switched from a free-text placeholder to a real `type="date"` field defaulting to today. Verified live end-to-end through the actual UI: seeded a real "sent" proposal, clicked Mark won in the browser, typed notes and picked a custom date (2026-07-15), confirmed, checked the row updated to "won" in the UI, then confirmed `outcome_notes` and `resolved_at` (matching the picked date) both persisted correctly in the real DB. Row cleaned up after.
- **In-app notification center.** 2026-08-04: new `notifications` table (RLS, owner-scoped) + `lib/db/notifications.ts` + `lib/actions/notifications.ts`, wired into `notify.ts`/`briefing.ts` alongside the email sends, gated by the same existing `prReadyInApp`/`stuckInApp`/`briefingInApp` prefs. Bell icon + dropdown panel added to `NavRail` (top-left, all authenticated pages), reusing the existing `NotificationCard` component. Verified live against the real local DB: seeded a real row via the service client, confirmed it rendered in the bell with correct unread badge/title/body/relative time, clicked it, confirmed the link navigation fired and `read_at` was actually persisted in Postgres, then cleaned up the test row. Not yet verified: an actual Inngest-triggered notification (real `ticket/state-changed` or `meeting/confirmed` event reaching `notify.ts`/`briefing.ts` and inserting for real) since that requires the agent-run/meeting E2E flows below, which are still pending.

### Pending

Nothing here has been run yet, in priority order for the 2-day window:

1. **Agent-run loop, full E2E.** Plan generate to approve, execute (branch + commit as the agent identity), CI-gate poll, open PR, review-approve, merge, all against a real connected GitHub repo. Also the 3-attempt retry-cap path (needs a repo with a workflow that always fails on `pull_request`), confirming `needs_human` and `agent_runs.attempt_count = 3`. This is the single biggest untested piece of the whole build.
2. **Chrome extension, loaded for real.** Never loaded as an actual unpacked extension in Chrome (`chrome://extensions` -> Load unpacked). Needs: real popup rendering in a real browser chrome, real `chrome.scripting.executeScript` scrape on a live Upwork tab, real token paste flow, real `chrome.storage.local` persistence.
3. **Real Upwork account testing.** Everything scraped so far was logged out. Never tested logged in: payment-verified badge, client star rating (both only render for a logged-in viewer), and the full popup flow (Client tab, Proposal tab, Insights tab) against a real Upwork session on a real job page.
4. **Production deploy smoke test.** Once deployed: sign-up/sign-in on the real domain, all 3 auth methods against production OAuth apps, GitHub repo-connect OAuth against its production callback, Skribby webhook actually delivered (this is also the first real chance to test that delivery at all, see above).
6. **Responsiveness check**, once/if the UI pass in Section 1 happens: click through core flows on a narrow window or real mobile device.
7. **UI general pass on real data volume.** Every screen so far was verified against small hand-seeded datasets (a handful of rows). Not checked: long lists, long text (job descriptions, ticket descriptions), many tickets/proposals/repos at once.
