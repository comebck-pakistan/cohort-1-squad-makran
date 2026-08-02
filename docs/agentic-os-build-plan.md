---
## AGENTIC OS — BUILD PLAN (v1.0, revised stack)

Paste this whole document as the first message in a new chat, along with the original context handoff. This plan supersedes Section 2 ("Next") of that handoff.

**Revision note (2026-08-02):** milestones reordered per explicit instruction: the web app (frontend + backend) must be fully built and running end-to-end before extension work resumes. Chrome extension screens (old M2) and Explain the Client (old M4, which depends on the extension's content script) both moved to the end, after the web app's backend milestones. Old milestone numbers are noted in parens below wherever renumbered.

---

### 0. STACK CHANGES FROM ORIGINAL HANDOFF

| Area | Was | Now | Why |
|---|---|---|---|
| Agent runtime / durable jobs | Inngest | **Inngest — kept, confirmed** | Native `step.run()` (durable, retried steps), `step.sleepUntil()` (exact-time scheduling — covers the 15-min-before-meeting briefing), and `step.waitForEvent()` (pauses a function until your UI sends an "approved" event — this is exactly the plan/approve/execute/review gate). One HTTP route (`/api/inngest`), no separate worker or deploy pipeline to host. |
| LLM orchestration | Anthropic API via Vercel AI SDK | **LangChain (JS)** on top of the Anthropic API, called *from inside* Inngest steps | LangChain structures prompt chains, retrieval, and structured output. It has no scheduling/retry/durability model of its own — Inngest still owns "when" and "how many retries," LangChain owns "what the LLM call actually does." |
| Email | Resend | **Nodemailer + Gmail SMTP** | Free, fine for solo-user volume. Revisit if daily send volume approaches Gmail's ~500/day limit. |

Everything else in the original handoff (Supabase, pgvector, Recall.ai, Plasmo, Vercel, design system, schema, state machines, confidence tiers) is unchanged and still authoritative.

**Architectural rule this confirms:** every multi-step or scheduled process is an Inngest function, not a hand-rolled cron sweep or callback chain. Concretely:
- Agent plan/execute/review loop → a single Inngest function with `step.run("plan")`, `step.waitForEvent("plan-approved")`, `step.run("execute")`, `step.run("review")`. Retry count for a step is Inngest's built-in retry, but the *product-level* 3-attempt cap (before `needs_human`) is still tracked explicitly in `agent_runs` and checked in code — don't conflate Inngest's low-level retry with your domain-level retry cap, they answer different questions ("did this HTTP call fail transiently" vs. "has the agent tried this ticket 3 times").
- Pre-meeting briefing → when a meeting is confirmed via Recall Calendar Integration, trigger an Inngest function that does `step.sleepUntil(meetingStart - 15min)` then sends the briefing.
- Meeting processing (Recall webhook → ticketization) → the webhook handler does the minimal signature-verify + ack, then sends an Inngest event; the actual LangChain ticketization chain runs inside the Inngest function, keeping the webhook response fast and giving you retry-on-failure for free.

**Timeout note carried over from the Trigger.dev/Inngest comparison:** each Inngest step still executes as a Vercel function invocation, so it inherits Vercel's function timeout (10s Hobby / 60s Pro). This is fine for the steps in this spec as designed — plan, execute-trigger, review-check are each short, bounded calls, not long blocking waits. If a future step needs to block on something slow (e.g. polling a long-running GitHub Action to completion), split it into a short "check status" step that Inngest re-invokes on a delay, rather than one call that blocks until done.

---

### 1. ENGINEERING PRINCIPLES (apply to every milestone below)

Since this is a real product, not a throwaway MVP, every milestone must respect:

1. **Feature-based folder structure**, not type-based. Group by domain (`clients/`, `proposals/`, `tickets/`, `meetings/`) with their own components, queries, and types — not one giant `components/` and `lib/` dumping ground.
2. **Service layer boundary.** UI components never call Supabase or Anthropic directly. Route through:
   - `lib/db/*` — typed query functions per table (repository pattern), single source of truth for how each table is read/written.
   - `lib/llm/*` — LangChain chains, one file per LLM-driven feature (client-analysis chain, proposal chain, ticketization chain). UI and API routes call these, never construct prompts inline.
   - `inngest/functions/*` — one Inngest function per durable/scheduled process (agent loop, briefing scheduler, meeting ticketization), each calling into `lib/llm/*` for any LLM work. Nothing outside this folder should construct or invoke an Inngest function directly.
3. **Types generated from the DB, not hand-duplicated.** Use `supabase gen types typescript` as the base type source; feature types extend/narrow those, never redefine columns by hand.
4. **Zod validation at every boundary** — API route input, webhook payloads, LLM structured output (LangChain output parsers). No "trust the shape" assumptions on external data (Recall payloads, GitHub webhook payloads, LLM JSON).
5. **Error/confidence states are first-class, not afterthoughts.** Every LLM-backed feature must implement its confidence tier / failure state in the same PR as the happy path — this was an explicitly named gap (Section 6 of the handoff: no error states designed yet). Each milestone below includes designing that screen state before building it.
6. **No feature ships without its state machine represented in the DB exactly as specified** (ticket/proposal/meeting enums) — no ad hoc status strings.
7. **One milestone = one reviewable unit.** Don't start milestone N+1 until N is working end-to-end (even against mock/seed data) and reviewed. This is the main lever against the "built everything at once, quality suffered" failure mode you're trying to avoid.

---

### 2. MILESTONE MAP (overview, reordered 2026-08-02)

```
M0  Frontend shell + design system implementation                          : DONE
M1  All web screens built against mock data (1–18 + Proposals/Clients)     : DONE
M2  Supabase schema, RLS, auth (OTP + Google + GitHub OAuth)               : DONE (local, all 3 auth methods verified) [was M3]
M3  Proposal Drafter (pgvector embeddings + retrieval + generation)        : DONE (local, OpenAI embeddings + gpt-5-nano) [was M5]
M4  Meetings pipeline (Recall.ai + Inngest + ticketization)                : DONE (manual-paste path verified local; Recall.ai code-complete, unverified, no account) [was M6]
M5  Agent Runtime (Inngest steps + GitHub API + PR flow)                   : code-complete, E2E verification skipped by user decision (needs GITHUB_TOKEN + test repo, deferred) [was M7]
M6  Insights Dashboard (pure DB aggregation, no LLM)                       : DONE (local, verified against hand-seeded proposals) [was M8]
M7  Notifications (Inngest scheduled + Nodemailer)                        : DONE (local, all 3 triggers + opt-in verified via staged test) [was M9]
      ↑ web app (frontend + backend) fully running end-to-end here ↑
M8  Chrome extension screens 19–25, build against mock data                [was M2]: DONE (mock data, Plasmo project scaffolded)
M9  Explain the Client (real data: extension content script → LLM → cache) [was M4], depends on M8: DONE
M10 Hardening pass (error states, empty states, rate limits, monitoring)   : covers M2–M9
```

Each milestone below has: **status**, **scope**, **explicit exclusions** (so scope doesn't creep), and **exit criteria** (how you know it's done and safe to move on).

---

### 3. M0 — Frontend shell + design system implementation

**Status: ✅ DONE.** All design tokens, primitives, Epistemic Grammar components, state components, console/feedback components, app shell, and the `/dev/components` gallery are built, typed, and verified (typecheck + lint + build clean).

**Scope**
- Next.js 16 App Router project scaffold, TypeScript strict mode.
- Design tokens from `design-system.md` implemented as CSS variables / Tailwind theme config (fonts: Space Grotesk, IBM Plex Sans, IBM Plex Mono via `next/font`).
- Shared primitives library: Button (4 variants), Card, State Chip (all 9 ticket states + 4 proposal states), Verdict Badge (4 states), Confidence meter, Epistemic Grammar components (Fact row, Prediction row, Synthetic wrapper + pill), Human-gate marker, Console/log surface.
- Left nav rail (240px) + app shell layout, auth-group layout (sign-in/sign-up), route groups per folder structure in the handoff.
- Storybook or an internal `/dev/components` route to visually verify every primitive in isolation before it's used in real screens (worth the half-day given how central the Epistemic Grammar is).

**Exclusions:** no data fetching, no Supabase client, no real auth — everything is presentational.

**Exit criteria:** every component in Section 5 of the design system exists, is typed, and renders correctly in light of all its stated states (e.g. state chip renders correctly for all 9 enum values, not just one).

---

### 4. M1 — All web screens, mock data

**Status: ✅ DONE.** All 18 designed screens plus Proposals list, Clients list (extrapolated from Tickets Board), and Sign In/Sign Up/Landing are built against mock data shaped like the real DB types, with error/empty states alongside the happy path. Verified via typecheck, lint, build, and browser click-through across all states.

**Scope:** build screens 1–18 plus the two flagged-missing screens (Proposals list, Clients list) using static/mock data objects that match the real DB types. Each screen's mock data should be shaped exactly like what the eventual Supabase query will return, so wiring in M2+ is a data-source swap, not a rebuild.

Also: since no error states existed yet (Section 6 open question), an error/empty state was designed and built per screen while it was cheap.

**Exclusions:** no real backend calls. No Chrome extension (that's M8 now).

**Exit criteria:** you can click through the entire web app, every screen, every state (loading/empty/error/populated), with nothing wired to Supabase yet.

---

### 5. M2 — Supabase schema, RLS, auth *(was M3)*

**Status: ✅ DONE (local Supabase stack).** Built and verified against `npx supabase start` (Docker), not a hosted cloud project; see notes below for what that does and doesn't cover.

**Scope, as built**
- All 8 tables (`integrations`, `repos`, `meetings`, `tickets`, `proposals`, `clients`, `client_contacts`, `agent_runs`) as SQL migrations in `supabase/migrations/`, exact enums and fields per the handoff, `owner_id` on every table.
- RLS: owner-only `for all using/with check (owner_id = auth.uid())` on every table, plus a follow-up migration granting table privileges to `authenticated`/`service_role` (newer Supabase projects no longer auto-expose new tables to Data API roles; RLS alone isn't sufficient without this).
- Indexes on every `owner_id`, on `tickets.state` / `proposals.state` / `meetings.status` / `clients.confidence_tier`, and on the FK join columns.
- Auth: Supabase Auth wired for OTP email + Google OAuth + GitHub OAuth in `supabase/config.toml`. All three verified end-to-end locally (real user, real session, lands on `/home`).
- `types/db.ts` now derives from `types/db-generated.ts` (real `supabase gen types typescript --local` output), narrowed back to the locked literal-union types, so every existing import (`ClientRow`, `MeetingRow`, etc.) kept its shape.
- `lib/db/*.ts` repository functions for all 8 tables (typed CRUD, RLS does the owner-scoping).
- `lib/supabase/client.ts` + `server.ts`, `proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`) redirecting unauthenticated requests to `/sign-in`.

**Discovered during build, deviates from the original spec:**
- The design system locked a 5-digit OTP code (`OtpCodeInput`). Supabase's GoTrue enforces a hard floor of 6 digits on email OTPs regardless of `otp_length` config (verified empirically: 5 → still sends 6, 8 → sends 8). Bumped `OtpCodeInput` and the sign-in/sign-up copy to 6 digits to match; this could not be resolved by config alone.
- Local dev needs a custom email template (`supabase/templates/magic_link.html`) with `{{ .Token }}`, since Supabase's default magic-link email only shows a link, not the bare code the UI's digit-box input needs.
- `config.toml`'s scaffolded `additional_redirect_urls` defaulted to `https://127.0.0.1:3000` (wrong scheme, no path). Since our OAuth redirect target is `http://127.0.0.1:3000/auth/callback`, it wasn't on the allow-list; GoTrue silently rejected it and fell back to bare `site_url`, landing the user on the marketing page with a dangling `?code=...` instead of `/auth/callback`. Fixed by adding the real callback URL to the allow-list.
- The Supabase CLI does not read `.env.local` (that's a Next.js-only convention) — `npx supabase start`/`stop` need the OAuth client id/secret exported into the actual shell env, or `config.toml`'s `env(...)` refs resolve to the literal string `env(...)`.
- Known Supabase CLI bug ([supabase/cli#4668](https://github.com/supabase/cli/issues/4668)): on every fresh `supabase start`, the auth container races Kong and tries fetching our custom OTP email template before Kong has created it, failing silently, every sign-in/sign-up email then arrives with no code, just a bare link. Fix every time: `docker restart supabase_auth_cohort-1-squad-makran` once the stack is up. See `docs/env-vars.md`.

**Exclusions:** no LLM features, no real GitHub PR flow yet (auth only, not repo actions). No Chrome extension work.

**Exit criteria, verified:**
- Sign-up → OTP verify → onboarding, and sign-in → OTP verify → `/home`, both confirmed end-to-end in the browser against the local stack (real Supabase user rows, real session cookies).
- `proxy.ts` confirmed redirecting an unauthenticated request to `/sign-in`.
- `scripts/rls-test.mjs` confirmed all 8 tables round-trip (insert+select) as the owning user, and that a second user gets zero rows back on select, a rejected insert, and a no-op update on every table. Run it yourself: `NEXT_PUBLIC_SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/rls-test.mjs` (keys from `npx supabase status`).
- Google and GitHub OAuth both confirmed end-to-end (real provider login → `/auth/callback` → `/home` signed in). All exit criteria passed.

---

### 6. M3 — Proposal Drafter *(was M5)*

**Status: DONE (local Supabase stack).**

**Scope, as built**
- pgvector extension enabled inside Supabase; `embedding vector(1536)` column added directly to `proposals` (no 9th table, see deviations below). `match_proposals` Postgres function does cosine-similarity top-k retrieval, `security invoker` so RLS still scopes it to the caller.
- `lib/llm/embeddings.ts` + `lib/llm/proposal-drafter.ts`: OpenAI `text-embedding-3-small` for embeddings, OpenAI `gpt-5-nano` for generation (per the user's explicit instruction to use OpenAI throughout, not the handoff's original Anthropic pick; see deviations).
- Survey-fallback mode when the user's embedded past-proposal corpus is under 10 rows, using onboarding's style-survey answers (tone/length/opener). Never labeled "in your voice", shown with a distinct "Survey-fallback draft" tag.
- Onboarding Import screen wired to `importPastProposals` (persists + embeds each pasted proposal as a `proposals` row, state `won`, no client) and Voice screen wired to `saveVoiceProfile` (stored on `auth.users.user_metadata`, not a new table).
- "New proposal" entry point on the Proposals list (paste job post text) since the Chrome extension trigger surface doesn't exist yet; calls `requestProposalDraft`, which decides in-voice vs. survey-fallback and saves a `draft` row.
- "Copy & Mark Sent" wired to `copyAndMarkSent`, real DB transition `draft → sent`. Outcome modal wired to `markProposalOutcome` for `sent → won/lost`.
- Example/synthetic data auto-hide: 2 hardcoded illustrative rows (hatch pattern + EXAMPLE DATA pill) shown only while the user's real resolved (won/lost) proposal count is under 10, never blended with real rows.

**Exclusions:** no voice feedback loop (explicitly deferred to post-v1.0 per handoff). No auto-send. No Chrome extension work.

**Discovered during build, deviates from the original spec:**
- Handoff's locked stack said "LLM: Anthropic API via Vercel AI SDK," but Anthropic has no embeddings API, and the user explicitly asked for OpenAI for both embeddings and generation. Built entirely on `@ai-sdk/openai`, no Anthropic dependency in this milestone.
- Cheapest-model check done against OpenAI's pricing page before wiring real calls: `text-embedding-3-small` ($0.02/1M tokens) was already the cheapest embedding model; generation was switched from an initial `gpt-4o-mini` guess to `gpt-5-nano` ($0.05 in / $0.40 out per 1M), confirmed cheapest via a live test call.
- features.md's cold-start rule ("0-1 proposals imported shows the survey banner") and the exit criteria's "<10 historical proposals falls back to survey mode" are two different thresholds for two different moments: 0-1 governs the onboarding-time fallback banner, 10 governs the per-draft in-voice vs. survey-fallback decision. Both are implemented as written, not merged.
- Table names are locked to the original 8 (no `profiles`/embeddings table). The embedding column lives on `proposals` directly; past-proposal corpus rows reuse `proposals` with `state = 'won'` and `client_id = null`. Voice-survey answers live in Supabase Auth's `user_metadata` instead of a new table.

**Exit criteria, verified:** drafting a proposal with <10 historical proposals correctly falls back to survey mode (`in_voice: false`, visually distinct); with ≥10, in-voice mode retrieves the top-3 similar past proposals and generates in that style (`in_voice: true`); "Copy & Mark Sent" correctly transitions `draft → sent` in the real DB. Verified end-to-end in browser plus direct DB checks, test data cleaned up afterward.

---

### 7. M4 — Meetings pipeline *(was M6)*

**Status: DONE (local Supabase + Inngest dev server; Recall.ai code-complete, unverified). User explicitly chose to skip Recall.ai E2E verification on 2026-08-02 (Recall.ai requires a business email to sign up, not available), same "code-complete, deferred" pattern as M5's GitHub E2E.**

**Scope, as built**
- pgvector-adjacent schema addition: `meetings.transcript_text` column (nullable), discovered mid-build, see deviations below.
- `lib/recall.ts`: create-bot, get-transcript, get-recording-url against Recall's documented API conventions. `app/api/webhooks/recall/route.ts`: Svix signature verification, fast-ack, DB status update + `meeting/ready-for-processing` Inngest event on call-ended.
- Smart auto-join: `resolveKnownClient` in `lib/actions/meetings.ts` matches guest email against `client_contacts` (real query, but real `clients`/`client_contacts` data doesn't exist until M9, so this always resolves `known_client: false` today, by design, not a bug).
- `inngest/functions/ticketize.ts`: triggered by `meeting/ready-for-processing`, uses OpenAI (`gpt-5-nano` via `lib/llm/ticketize.ts`, structured output via `generateObject`) instead of the handoff's original LangChain/Anthropic pick, consistent with M3's OpenAI-only decision. Writes to `meetings.draft_tickets`, never `tickets` directly.
- Transcript handling: `transcript_source` set to `caption`, `whisper_fallback` (via `lib/llm/whisper.ts`, OpenAI `whisper-1`), or `manual`, as a separate retryable `step.run` inside the same function.
- Meeting Draft Review screen (Screen 7) wired to real `meetings` + `repos` data; "Confirm & create tickets" promotes edited drafts into real `tickets` rows (state `backlog`) via `promoteDraftTickets`, the human-confirm gate, then clears `draft_tickets`.
- `inngest/functions/briefing.ts`: `step.sleepUntil(meetingStart - 15min)`, reads cached `clients`/`proposals` data (no new LLM call), sends via `lib/mail.ts` (Nodemailer) to the freelancer's own inbox (not the client). Pre-meeting briefing preview screen wired to real data too.
- Manual paste path (`createManualMeeting`): processes immediately, no bot/webhook wait, the only path actually verified end-to-end.

**Exclusions:** no live mid-call transcript streaming. No auto-generated summaries (draft tickets are the digest). No Chrome extension work. No real Clients-data wiring (that's M9, `client_id` stays null on new real meetings until then).

**Discovered during build, deviates from the original spec:**
- `proxy.ts`'s auth gate was redirecting `/api/inngest` and `/api/webhooks/*` to `/sign-in`, since those callers have no user session cookie. Fixed by excluding both path prefixes from the auth check. Real bug, not just a local-dev quirk, would have broken this in any environment.
- `meetings` had no column to hold transcript text (only `draft_tickets`, the intentional digest). But the already-designed Draft Review screen needs the transcript for context during async review. Added `meetings.transcript_text` (nullable), cleared on confirm/discard, kept separate from `draft_tickets` so the "no auto-generated summaries" rule still holds for the permanent record.
- LLM stack again deviates from handoff's Anthropic pick: ticketization and Whisper transcription both run on OpenAI (`gpt-5-nano`, `whisper-1`), matching M3's explicit user instruction to use OpenAI throughout.
- Inngest SDK v4's actual API differs from older docs/examples: no `EventSchemas`/typed-events helper in this version, `createFunction({ id, triggers: [{ event }] }, handler)` takes 2 args not 3, and local dev needs `isDev: true` on the client (not just an env var) or every request 500s with "in cloud mode but no signing key found."
- Local Mailpit SMTP wasn't reachable from the host (only its web UI port was mapped). Uncommented `smtp_port = 54325` in `supabase/config.toml` so Nodemailer can reach it locally, same pattern Auth's own OTP emails already used.
- Recall.ai has no local/mock substitute: `scheduleBotMeeting` and the webhook receiver are built against Recall's documented API but unverified against a real account. The manual-paste path was used for all real end-to-end verification instead.

**Exit criteria, verified (manual-paste path):** a real test meeting (pasted transcript) flows `processing → ready`, produces correct, genuinely actionable draft tickets (verified against a scripted test transcript), and "Confirm & create tickets" correctly promotes them into real `backlog` tickets. A known-client meeting (seeded test client/contact, since real Clients data doesn't exist until M9) correctly fires the pre-meeting briefing email at the 15-minute mark, with real cached verdict/price-band/proposal data, to the freelancer's own inbox. The `in_progress → processing → ready` bot-recall path is code-complete but unverified, blocked on a real Recall.ai account (needs a business email to sign up); user explicitly chose to skip this verification (2026-08-02) and move to M8, code is otherwise believed correct pending that real-world check.

---

### 8. M5 — Agent Runtime *(was M7)*

**Status: code-complete. `tsc`/`eslint`/`npm run build` all clean; UI verified in browser (auth, empty Tickets board matches empty DB, Settings, Integrations connect-repo flow fails gracefully with "GITHUB_TOKEN is not set" when unconfigured). Real E2E run (plan→approve→execute→PR→review→merge, plus the 3-attempt retry-cap case) deferred by explicit user decision on 2026-08-02, still needs a real `GITHUB_TOKEN` and a real test repo, same as M4's Recall.ai caveat.**

**Scope, as built**
- A single `inngest/functions/agent-run.ts` implementing the whole plan/approve/execute/review loop as one durable function, up to 3 attempts in a `for` loop: `step.run("plan-N")` (generate) then `step.waitForEvent("plan-decision-N", {match: "data.ticketId"})`, then on approval `step.run("execute-N")` (branch, LLM-generated file changes, commit via GitHub Contents API), a bounded `step.run`/`step.sleep` poll loop against GitHub's check-runs API, `step.run("open-pr-N")`, then `step.waitForEvent("review-decision-N")`. Plan-decision and review-decision events are both sent by real server actions (`submitPlanDecision`, `submitReviewDecision`) triggered from the Ticket detail screen's approve/reject buttons.
- `lib/github.ts`: repo verification, branch creation, per-file commits via the Contents API (author/committer hard-set to `Agentic OS Agent <agent@agentcos.dev>` on every call, regardless of the token's identity), PR open/merge, and a check-runs poller that rolls multiple check-runs up into one pending/success/failure verdict.
- `lib/llm/agent.ts`: `generatePlan()` and `generateFileChanges()`, both `gpt-5-nano` via `generateObject`, matching M3/M4's OpenAI-only decision. `feedback` (a human's rejection notes, or the previous attempt's CI failure) is folded into the next attempt's plan prompt, never silently dropped.
- Domain-level retry cap of 3 (distinct from Inngest's own transient-failure retry): one loop iteration is one attempt, whether it ends in a CI failure, a human plan rejection, or a human "request changes" at review. All three funnel into the same counter and the same `needs_human` terminal state once the cap is hit, matching the design mock's copy ("Attempt N of 3" shown at both the plan-reject and review-changes-requested points).
- Cost estimate module: fact row is the real logged `token_cost` on the ticket's `agent_runs` rows (converted from `usage.inputTokens`/`outputTokens` via `gpt-5-nano`'s per-token pricing). Prediction row shows the min-max range across the user's own past completed runs, with zero fabrication if none exist yet, see deviations below for why it's not strictly bucketed by file count.
- Live execution log: `agent_runs.log` (new jsonb column, see deviations), polled via `router.refresh()` every 4s while a ticket is `agent_running`/`executing`, rendered in the existing dark `ConsoleLog` surface.
- Ticket detail screen (Plan approval, Live log, Review/PR, Changes requested, Needs human, Done) and Tickets board both wired to real `tickets`/`agent_runs`/`repos` data.

**Exclusions:** no kanban/board view (explicitly excluded). No inline diff viewer (explicitly excluded). No Chrome extension work. Manual ticket editing (the needs_human state's "Edit ticket manually" button) stays a stub, not part of the agent loop.

**Discovered during build, deviates from the original spec:**
- Handoff's locked stack said "OAuth (not GitHub App)" for GitHub, but no infrastructure exists to capture and durably persist an OAuth provider token (Supabase Auth's GitHub sign-in doesn't request `repo` scope and doesn't keep `provider_token` past the callback), and building that was judged out of scope for this milestone. Used a personal access token (`GITHUB_TOKEN`, scopes `repo` + `workflow`) instead, the same external-hard-dependency pattern as `RECALL_API_KEY` in M4. Settings, Integrations' "Connect repo" now does a real GitHub API call (verifies access, then saves) instead of a mock toggle, but there's no repo picker UI, `owner/repo` is typed directly.
- "GitHub Actions API integration" in the original scope line is read as "poll GitHub's check-runs API to gate the execute step on CI," not "trigger workflow runs directly." A repo with no CI configured at all is treated as an immediate pass (nothing to block on), so the happy-path exit criterion doesn't require authoring a workflow file, only the retry-cap criterion does (needs a workflow that reliably fails).
- The agent has no read access to a repo's actual file contents (no such capability was built, a real repo-aware coding agent is well beyond this milestone's scope). `generateFileChanges()` writes complete file contents from the ticket description and plan alone, and always overwrites at the given path. This is honest and works for the exit criteria's "small, focused ticket" case, but isn't a general-purpose coding agent.
- `tickets.plan_summary` is a single text column, no structured plan-files column exists. The plan's file list and out-of-scope note are folded into `plan_summary` as formatted text (`formatPlanSummary()`) rather than adding a new column; the Plan approval card renders it as pre-wrapped text instead of the mock's separate file-icon rows.
- `agent_runs.token_cost` is an `integer` column (locked schema from M2), but the M1 mock data used decimal dollar values directly, a pre-existing inconsistency, not introduced this milestone. Resolved by treating the column as integer cents: real writes store `Math.round(dollarCost * 100)`, the UI divides by 100 at render time.
- Cost estimate's "bucketed by file count" (per the original scope line) isn't a queryable column at plan-approval time (files are only known once the plan or execute step actually runs, and aren't persisted structurally, see above). Implemented instead as an overall historical average across the user's completed runs, still real, still "no history, no estimate," just not sliced by exact file count.
- Added `agent_runs.log` (jsonb, default `[]`), the live console needs somewhere to persist growing step-by-step log lines across a durable, replayable Inngest function; each log-append step reads the current DB value, appends, and writes back (self-contained per step) rather than relying on in-memory accumulation, which Inngest's step-memoization would silently break on replay.
- No Supabase Realtime wiring: `router.refresh()` polling every 4s during `agent_running`/`executing` was simpler than setting up a Realtime channel and adequate for how fast this loop actually moves.

**Exit criteria, deferred (not verified):** a real ticket, assigned against a real connected GitHub test repo, correctly generates a plan, gates at plan approval, executes (branch + commit with `Agentic OS Agent <agent@agentcos.dev>` as both author and committer, confirmed via the GitHub commit's API response), gates again at PR review, and merges on approval. A second ticket against a repo with a workflow that always fails on `pull_request` correctly loops three times and lands on `needs_human`, with `agent_runs` showing 3 attempt rows and the ticket's `attempt_count` at 3. Blocked on the user providing `GITHUB_TOKEN` and a real test repo (with a deliberately-failing workflow for the retry-cap case); user explicitly chose to skip this verification for now (2026-08-02) and move to M6, code is otherwise believed correct pending that real-world check.

---

### 9. M6 — Insights Dashboard *(was M8)*

**Status: ✅ DONE (local Supabase).**

**Scope, as built**
- `lib/insights.ts`: pure function `computeInsights(proposals, now)`, no LLM, no DB access, over the caller's own `ProposalRow[]`. Computes proposals-sent (last 90 days, by `sent_at`), win rate, avg time to close, pending count, won/lost reason breakdowns, recent outcomes (sorted by `resolved_at` desc), and a monthly win-rate trend, all with "no history, no estimate" (`null`/empty, never fabricated).
- `features/insights/InsightsDashboardScreen.tsx` now takes `initialProposals: ProposalRow[]` instead of importing `mockProposals` directly, real numbers flow through `computeInsights`. Example-data toggle (10-resolved threshold, unchanged from M1) and its hatch-overlay/EXAMPLE DATA styling untouched.
- `app/(app)/insights/page.tsx` is now an async server component: `listProposals(supabase)` → `InsightsDashboardScreen`.
- Outcome Capture modal (Screen 13) was **already** wired to real writes as of M3 (`markProposalOutcome` server action, `lib/actions/proposals.ts`), no changes needed there beyond the `resolved_at` stamp below.

**Discovered during build:**
- No timestamp existed anywhere to compute "avg time to close" or "win rate over time" (only `sent_at` and `created_at` existed, no resolution timestamp). Added `proposals.resolved_at` (timestamptz, migration `20260802180500_proposals_resolved_at.sql`), stamped by `markProposalOutcome` at the same time as `state`/`outcome_reason`. Both stats correctly show "–" / an explicit no-estimate empty state when no resolved proposals have both `sent_at` and `resolved_at` yet, consistent with the rest of the app's "never fabricate" rule.
- `OutcomeCaptureModal`'s `notes`/`date` fields are captured in local component state but never persisted (no DB columns for them, `confirmOutcome` in `ProposalsListScreen.tsx` only forwards `reason`) — a pre-existing gap from M3, not touched here, out of this milestone's "pure aggregation" scope.

**Exit criteria, verified 2026-08-02:** hand-seeded 6 real `proposals` rows via direct SQL (1 draft, 1 sent/pending, 3 won, 1 lost, spanning two calendar months) under the signed-in test account, confirmed every dashboard number by hand (sent count, win rate, avg time to close, reason-breakdown percentages, recent-outcomes ordering, and the monthly win-rate trend chart) matched the UI exactly, then deleted the seed rows. Empty state (0 real proposals) and the Example-data toggle both verified separately in the same session. `tsc`/`eslint`/`npm run build` all clean.

---

### 10. M7 — Notifications *(was M9)*

**Status: ✅ DONE (local Supabase + Inngest dev server + Mailpit).**

**Scope, as built**
- `agent-run.ts`'s every ticket-state write now goes through a new `setTicketState()` helper (DB update + `inngest.send("ticket/state-changed", {ticketId, state})`, both inside the same `step.run`, so a replayed/memoized step never double-sends). `tickets.ts`'s `assignAgentToTicket` emits the same event for `agent_running`.
- `inngest/functions/notify.ts`: reacts to `ticket/state-changed`. `review` and `needs_human` are the two named fixed triggers, each gated by its own preference; every other state only emails if the user opted into "every status change" (so turning that on notifies about transitions not already covered by a specific trigger, rather than double-firing on `review`/`needs_human` too).
- `lib/notifications.ts` / `lib/actions/notifications.ts`: `NotificationPrefs` stored on `auth.users.user_metadata.notification_prefs`, same per-user-singleton pattern as M3's voice profile, no new table. Defaults match the original design mock exactly (PR-ready and stuck default on for both channels, briefing defaults email-on/in-app-off, every-change defaults off).
- Settings → Notifications screen (Screen 16) now takes `initialPrefs`/`email` props, every toggle calls `saveNotificationPrefs` immediately on change (same "optimistic update + real server action" pattern as the rest of the app), real signed-in email shown instead of the mock's hardcoded `jordan@gmail.com`.
- `briefing.ts` (M4's already-verified pre-meeting briefing function) keeps its own inline `sendEmail` call rather than being rerouted through generic `ticket/state-changed`-style events, since meetings aren't tickets and rebuilding its rich HTML content a second place inside `notify.ts` would be pure duplication. It now loads the same real `notification_prefs` and skips the send if `briefingEmail` is off, so it's gated by the same real preference store as the other two triggers.

**Discovered during build / deviations:**
- The handoff's "email (Resend) + in-app" delivery channel was never fully designed: none of the 18 designed screens is an in-app notification center/inbox, so there is nowhere to actually deliver an in-app notification to. The per-trigger "In-app" toggles on the Settings screen are real (saved to and loaded from `user_metadata`, persist correctly across reload) but currently have no delivery mechanism behind them, this is called out directly in the screen's copy ("this toggle is saved but has no effect") rather than silently doing nothing. Building a notification-center screen was judged out of scope for this milestone.
- Resend (per the original handoff) was never adopted anywhere in this build; M4 already chose Nodemailer/Gmail SMTP (defaulting to local Mailpit) and M7 continues that, no new hard external dependency introduced.
- Added `NEXT_PUBLIC_APP_URL` (optional, defaults to `http://localhost:3000`) purely to build a clickable ticket link inside notification emails.

**Exit criteria, verified 2026-08-02:** staged test against the real local stack (Inngest dev server events sent directly via its `/e/test` endpoint, real Mailpit inbox, real signed-in test account). Confirmed, in order: (1) `review` state fires a real PR-ready email; (2) `needs_human` fires a real "agent stuck" email; (3) an unrelated state (`executing`) with `everyChange` off sends nothing; (4) toggling `everyChange` on via the real Settings UI (confirmed persisted to `user_metadata` in the DB) and resending the same `executing` event sends a real generic status-change email; (5) toggling `prReadyEmail` off and resending `review` sends nothing (and does not fall through to the generic email either, confirming the no-double-fire rule); (6) a real `meeting/confirmed` event with `briefingEmail` off completes the function with the send step correctly skipped, no email; (7) toggling `briefingEmail` back on and resending a fresh `meeting/confirmed` event sends the real briefing email (regression check that M4's briefing content still renders correctly post-gating-refactor). All test tickets/meetings/clients and the test account's `notification_prefs` were deleted/reset afterward. `tsc`/`eslint`/`npm run build` all clean.

**Web app milestone, exit criteria for the whole run:** once M2–M7 above are done, the web app (frontend + backend) is fully running end-to-end on real data, with nothing left mocked. This is the gate before Chrome extension work resumes.

---

### 11. M8 — Chrome extension screens (19–25) *(was M2)*

**Status: ✅ DONE (mock data, Plasmo project scaffolded).**

**Scope, as built**
- `extension/` is a standalone Plasmo project (own `package.json`, own `node_modules`, not part of the Next.js app's build), targeting `chrome-mv3`. Single entry point `extension/src/popup.tsx`, no content script or background script yet (out of scope until M9's real Upwork scraping).
- Shared primitives were **copied**, not monorepo-shared: `styles/tokens.css` and four components (`Button`, `VerdictBadge`, `PriceBand`, `HumanGateBar`) were copied verbatim from the web app's `components/` into `extension/src/components/` and `extension/src/styles/tokens.css`. The popup's own layout (header, tabs, signal rows, cards) is new code in `extension/src/components/PopupShell.tsx` and per-screen files under `extension/src/screens/`, since the 380px popup constraint makes the layout different enough from any existing web screen that adapting one would be more code than writing it directly, matching the build-plan's own "decide based on divergence" guidance.
- Fonts: `next/font` isn't available outside a Next.js build, so the same three families (Space Grotesk, IBM Plex Sans, IBM Plex Mono) are self-hosted via `@fontsource/*` packages instead (`extension/src/styles/fonts.css`), no external network font requests at runtime (important for an extension's CSP).
- Mock data lives in `extension/src/mock/{client,proposal,insights}.ts`, one object per scenario variant, shaped closely after each design mockup's actual copy (job titles, dollar figures, signal labels) rather than placeholder text.
- All 7 designed screens built: Client tab (full/low/insufficient confidence variants), Proposal tab (in-voice/survey-fallback variants), Insights tab (compact dashboard with EXAMPLE DATA watermark), and the 3 utility states (signed-out, loading, not-on-job-page).
- A small "MOCK SCENARIO" dev switcher bar (`extension/src/popup.tsx`'s `DevScenarioSwitcher`) lets every state be selected directly, since there's no real data source yet to drive state transitions organically, the same reason M1's mock web screens needed explicit per-state handling.

**Exclusions:** no real Upwork DOM scraping (no content script exists yet). No real LLM calls, no chrome.* storage/auth calls, everything is local React state. No shared monorepo package, primitives are a copied/synced set per the build-plan's own allowed alternative.

**Discovered during build:**
- Plasmo expects entry points inside `src/` once a `src/` directory exists at the project root (not at the project root itself), confirmed via Plasmo's own README ("avoid putting source code in your root directory by putting them in a `src` sub-directory"). `popup.tsx` was placed at `extension/src/popup.tsx` accordingly.
- No app icon graphic exists anywhere in the design assets (only the "Agentic OS" text wordmark), Plasmo's build fails without one. Generated a simple placeholder 512×512 PNG (`--signal` colored square with a white "A") via ImageMagick at `extension/assets/icon.png`; a real icon design is a fair thing to revisit later but wasn't blocking for a mock-data milestone.
- CSS Modules need an ambient type declaration outside Next.js (`*.module.css` has no built-in types), added `extension/src/global.d.ts`.

**Exit criteria, verified 2026-08-03:** `npx tsc --noEmit` and `npx plasmo build` both clean. Since this milestone's popup makes no `chrome.*` API calls yet, the built `build/chrome-mv3-prod/popup.html` was served over a plain local HTTP server and driven directly in-browser (loading it as an unpacked extension would additionally require a native OS file-picker step that isn't automatable): confirmed all 9 states render with the correct mock content and matching visuals against the design mockups, signed-out, loading, not-on-job-page, client full/low/insufficient confidence, proposal in-voice/survey-fallback, and the insights compact dashboard, cycling through the dev scenario switcher and the Client/Proposal/Insights tabs.

---

### 12. M9 — Explain the Client *(was M4)*

**Status: ✅ DONE.**

**Scope, as built**
- No content-script/injected panel: the popup itself runs the scrape on demand via `chrome.scripting.executeScript` against the active tab when it's a real Upwork job page, no persistent content script needed for this milestone (M8's popup shell already existed, this reuses it directly).
- `extension/src/lib/scrape.ts`: `scrapeUpworkJobPage()`, verified live against real Upwork job pages 2026-08-03 (both logged out): job title from the page's one `<h1>`, description from `[data-test="Description"]` (a real, stable QA hook Upwork exposes), the "About the client" sidebar has no such hooks so it's parsed by known UI-copy label patterns (`Member since`, `total spent`, `N hires, N active`), more stable across deploys than internal class names. Payment-verified and star rating only render for a logged-in viewer (confirmed absent when logged out, no Upwork account available to verify that branch), read defensively, `null` if not found rather than assumed.
- `lib/client-analysis/tier.ts`: `computeConfidenceTier()`, pure and deterministic, not LLM, per the build-plan's own note that tier must come from facts not judgment. `full` requires all three hard signals (payment verified, spend > 0, hires ≥ 1); `insufficient` is the true absence of all three; `low` is everything between.
- `lib/llm/client-analysis.ts`: `analyzeClient()`, `gpt-5-nano` + `generateObject` + zod (OpenAI, not LangChain/Anthropic, same stack decision as M3-M5). `tier === "insufficient"` short-circuits deterministically before any LLM call, verdict `"New · Unverified"`, no fabricated reasoning. Otherwise the LLM produces `{verdict, reasoning, priceBandMin/Max/Note}` from the job post, the tier/signals, and the freelancer's own rate history, explicitly instructed never to invent this specific client's average rate paid (that data isn't obtainable, see deviation below).
- `app/api/extension/analyze-client/route.ts`: Bearer-token-authenticated (see deviation below), sha256 hash of `{postedBudget, signals}` short-circuits (cached, no LLM call) if unchanged and `last_analyzed_at` within 30 days, else runs tier + LLM and upserts `clients` via `lib/db/clients.ts`'s new `findClientByUpworkUrl`/`upsertClientAnalysis`.
- `lib/actions/rates.ts` + `RateHistoryScreen` wired to real data (`auth.users.user_metadata.rate_history`, same per-user-singleton pattern as M3/M7): this was still 100% mock since M1 (flagged then as "unreconciled"), needed now as a real input to the price-band blend.

**Discovered during build, deviates from the original spec:**
- **No client identity is exposed to scraping at all**, logged in or out: no client ID, no company name, no profile link anywhere on the job page. `clients.upwork_url` (the job's own URL) is the dedupe key instead of a true cross-job client identity; caching is job-page-scoped, which is exactly what the exit criterion asks for ("second view of the same page") but isn't what "one client, many job posts" would ideally want. `clients.name` is set to the job title, since there's no real client/company name to use and fabricating one would violate the app's own rule.
- **"Avg rate paid by this specific client" (shown in the M8 design mock) is not real, obtainable data.** Upwork does not expose a client's average rate paid to a non-applicant, logged in or out, confirmed empirically. The price band is instead blended from the job's own posted budget (when present) and the freelancer's own rate history only, never a fabricated per-client number, the LLM prompt explicitly forbids inventing one.
- **Auth bridge, not in the original scope bullets:** the extension is a separate origin with no session cookie and can't safely embed `OPENAI_API_KEY`. Added a small `extension_tokens` table (owner_id, token) and a Settings → Integrations "Browser extension" card (generate/show-once Bearer token, same trust level as `GITHUB_TOKEN`), pasted into the extension's sign-in screen, stored in `chrome.storage.local`. `proxy.ts`'s auth gate needed the same `/api/extension/` exclusion M4 already needed for `/api/inngest` and `/api/webhooks/`, same bug class, caught before it shipped this time.
- Root `tsconfig.json` picked up `extension/**` for the first time this milestone (nobody had run `tsc` from repo root touching extension files before): excluded it, same as `eslint.config.mjs`, since it's a fully separate Plasmo project with its own tsconfig/build.
- M8's mock-data dev switcher (`MOCK SCENARIO`) stays intact for demo purposes; a new `Auto (real)` option drives everything from the real token + real active-tab scrape instead. Proposal and Insights tabs stay mock-only in `Auto` mode too, correctly excluded from this milestone's scope.

**Exclusions:** proposal drafting, meetings, agent runtime, all untouched. No persistent content script (not needed, popup-time scraping covers the exit criterion).

**Exit criteria, verified 2026-08-03:** real Upwork job pages inspected live in-browser to ground the scraper's selectors (not guessed). `scrapeUpworkJobPage()` run directly against a real, live job page (title, description, `$8.2K total spent`, `16 hires`, `Member since Apr 15, 2024` all extracted correctly). The real signed-in test account generated a real extension token via Settings → Integrations; `/api/extension/analyze-client` called directly (curl, same reasoning as M7's staged Inngest test: verifying through the seams actually reachable, since loading an unpacked extension needs a native OS file-picker step that isn't automatable here) confirmed: full tier → `BID` with a price band from the posted budget; low tier (real scraped signals, no payment-verified) → `MAYBE`, no fabricated price band; insufficient tier → deterministic `New · Unverified`, zero LLM cost; a repeat call with identical signals returned `cached: true`; an invalid token returned 401; adding a real rate-history entry via the real Settings UI and re-analyzing a fresh job correctly blended it into the suggested price band when no budget was posted. All `clients` rows matched the API responses exactly via direct DB query. All test data (4 `clients` rows, the extension token, the rate-history entry) deleted/reset afterward. `tsc`/`eslint`/`npm run build` (main app) and `tsc`/`plasmo build` (extension) all clean.

---

### 13. M10 — Hardening pass

**Status: not started. Covers M2–M9** (both the web app's backend milestones and the Chrome extension milestones).

**Scope:** this is where the "no error states designed" gap gets closed for real integrations (webhook failures, Recall bot failed to join, GitHub OAuth error, Whisper fallback failure) — go back through M2–M9 and confirm every failure mode has a designed and built state, not just a console.error. Add basic rate-limit handling on the Anthropic and GitHub APIs. Add minimal monitoring (Vercel logs + a simple alert on `needs_human` accumulation).

**Exit criteria:** you can force each documented failure mode in a staging environment and get a correct, human-readable state on screen — not a blank page or unhandled exception.

---

### 14. STILL-OPEN QUESTIONS TO RESOLVE BEFORE OR DURING M4/M5

Carried over from the original handoff, unresolved by this plan — flag these to Claude rather than letting it assume:
- "Communication style" block in pre-meeting briefing — LLM-generated-and-cached at analysis time, or a user-editable notes field? Needs a decision before M4 (Meetings pipeline).
- Pricing page — no model decided; not blocking for build, but the landing page has a dangling nav link.

---

### 15. HOW TO WORK THROUGH THIS WITH CLAUDE

- Work one milestone at a time, in the order in Section 2. Don't let Claude start M(N+1) code until M(N)'s exit criteria are actually met.
- At the start of each milestone, ask Claude to restate the milestone's scope and exclusions back before writing code — cheap check against scope creep.
- Treat the "Exclusions" line per milestone as a hard boundary, not a suggestion — if Claude's implementation starts pulling in a later milestone's concern, stop and split it out.
