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
M5  Agent Runtime (Inngest steps + GitHub API + PR flow)                   [was M7]
M6  Insights Dashboard (pure DB aggregation, no LLM)                       [was M8]
M7  Notifications (Inngest scheduled + Nodemailer)                        [was M9]
      ↑ web app (frontend + backend) fully running end-to-end here ↑
M8  Chrome extension screens 19–25, build against mock data                [was M2]: designs DONE, build not started
M9  Explain the Client (real data: extension content script → LLM → cache) [was M4], depends on M8
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

**Status: DONE (local Supabase + Inngest dev server; Recall.ai code-complete, unverified).**

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

**Exit criteria, verified (manual-paste path):** a real test meeting (pasted transcript) flows `processing → ready`, produces correct, genuinely actionable draft tickets (verified against a scripted test transcript), and "Confirm & create tickets" correctly promotes them into real `backlog` tickets. A known-client meeting (seeded test client/contact, since real Clients data doesn't exist until M9) correctly fires the pre-meeting briefing email at the 15-minute mark, with real cached verdict/price-band/proposal data, to the freelancer's own inbox. The `in_progress → processing → ready` bot-recall path is code-complete but unverified, blocked on a real Recall.ai account.

---

### 8. M5 — Agent Runtime *(was M7)*

**Status: not started.** Next milestone up.

**Scope**
- A single `inngest/functions/agent-run.ts` implementing the plan/approve/execute/review loop as one durable function: `step.run("plan")` → `step.waitForEvent("plan-approved", { timeout: ... })` (the Ticket detail → Plan approval screen sends this event on human approval) → `step.run("execute")` → `step.run("review")`. This is the cleanest fit for a human-in-the-loop gate — the function genuinely pauses (no polling, no separate state-machine table needed just to track "waiting for approval").
- GitHub Actions API integration; commit author hard-set to `Agentic OS Agent <agent@agentcos.dev>` regardless of OAuth identity — verify this in a test, since it's a hard requirement, not a default.
- Domain-level retry cap of 3 (distinct from Inngest's own transient-failure retry, per Section 0's note) enforced by attempt-count read from `agent_runs`; the function itself re-enqueues a fresh `agent-run` event for the same ticket on a recoverable failure, checking the count each time, and auto-flags `needs_human` once the cap is hit.
- Cost estimate module: fact row (logged token cost) + prediction row (bucketed by file count vs. past `agent_runs`), with the "no bucket history → no estimate" rule enforced as a real code path, not just a UI placeholder.
- Live console screen (already designed, Screen 10) wired to real execution log via realtime (Supabase Realtime or polling — decide based on how "live" it needs to feel).
- Ticket detail screens (Plan approval, Review/PR) wired to real state.

**Exclusions:** no kanban/board view (explicitly excluded). No inline diff viewer (explicitly excluded). No Chrome extension work.

**Exit criteria:** a real ticket goes through the full loop against a real (test) repo, correctly gates at plan-approval and PR-review, correctly attributes commits, correctly hits `needs_human` after 3 failed attempts on a deliberately-broken test case.

---

### 9. M6 — Insights Dashboard *(was M8)*

**Status: not started.**

**Scope:** pure DB aggregation (win/loss patterns, outcome reasons) — no LLM involved, per the handoff. Outcome capture modal (already designed, Screen 13) wired to real writes. Example-data-ON state (Screen 12b) correctly toggles based on the 10-proposal threshold.

**Exit criteria:** dashboard numbers are verifiably correct against seed data you construct by hand (this is the one place you can fully unit-test the aggregation logic).

---

### 10. M7 — Notifications *(was M9)*

**Status: not started.**

**Scope:** the 3 fixed triggers (PR ready, needs-human, pre-meeting briefing) fire as Inngest events sent from the agent-run and briefing functions above; a single `inngest/functions/notify.ts` handles delivery via Nodemailer/Gmail SMTP, plus the global opt-in "every ticket status change" (off by default). Settings — Notifications screen (already designed, Screen 16) wired to real preference storage.

**Exit criteria:** all 3 triggers fire correctly in a staged test; opt-in toggle correctly gates the extra notifications.

**Web app milestone, exit criteria for the whole run:** once M2–M7 above are done, the web app (frontend + backend) is fully running end-to-end on real data, with nothing left mocked. This is the gate before Chrome extension work resumes.

---

### 11. M8 — Chrome extension screens (19–25) *(was M2)*

**Status: designs DONE, build not started.** All 7 Claude Design mockups exist and are verified in `web-designs/` (`Extension Client Full Analysis`, `Extension Client Low Confidence`, `Extension Client Insufficient Data`, `Extension Proposal In-Voice Draft`, `Extension Proposal Survey Fallback`, `Extension Insights Compact Dashboard`, `Extension Utility States`). The Plasmo project itself has not been scaffolded and none of the 7 screens have been built yet; that work is now deferred until the web app (M2–M7) is complete, per the reordering above.

**Scope:** scaffold the Plasmo extension project and build all 7 screens against mock data, matching the web app's shared primitives where reusable (state chips, epistemic grammar rows) — consider a shared `packages/ui` if using a monorepo, or a copied/synced component set if not (decide based on how much divergence the 380px popup constraint forces).

**Exclusions:** no real Upwork DOM scraping yet, no real LLM calls.

**Exit criteria:** extension popup navigable through all states (signed-out, loading, not-on-job-page, full/low/insufficient confidence, in-voice/survey-fallback proposal, insights tab) with mock data.

---

### 12. M9 — Explain the Client *(was M4)*

**Status: not started. Depends on M8** (needs the extension's content script + popup shell to exist before real scraping can be wired in).

**Scope**
- Extension content script scrapes Upwork client data.
- `lib/llm/client-analysis.ts` — LangChain chain calling Anthropic, with a Zod-validated structured output schema matching the three confidence tiers.
- Confidence tier logic implemented exactly per the exact triggers in the handoff (≥1 hire AND reviews/spend visible → full; etc.) — this logic should live in a plain deterministic function, NOT be left to the LLM to self-report, since the tier is derived from Upwork data facts, not judgment.
- Price band calc (blend of client history + user rate history, falling back per tier).
- Caching: `clients.last_analyzed_data_hash`, hash-match short-circuit, 30-day soft TTL, manual refresh action.
- Wire into the M8 extension screens (real data replaces mock).

**Exclusions:** proposal drafting, meetings, agent runtime — this milestone is client analysis only.

**Exit criteria:** for a real Upwork job page, the extension shows the correct tier, correct verdict badge, correct price band (or absence of one), and cache correctly short-circuits on a second view of the same unchanged page.

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
