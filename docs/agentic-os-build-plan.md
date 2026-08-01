---
## AGENTIC OS — BUILD PLAN (v1.0, revised stack)

Paste this whole document as the first message in a new chat, along with the original context handoff. This plan supersedes Section 2 ("Next") of that handoff.

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

### 2. MILESTONE MAP (overview)

```
M0  Frontend shell + design system implementation
M1  All web screens built against mock data (1–18 + Proposals list + Clients list, per open questions)
M2  Chrome extension screens 19–25 — design in Claude Design, then build against mock data
M3  Supabase schema, RLS, auth (OTP + Google + GitHub OAuth)
M4  Explain the Client (real data: extension content script → LLM → cache)
M5  Proposal Drafter (pgvector embeddings + retrieval + generation)
M6  Meetings pipeline (Recall.ai + QStash + ticketization)
M7  Agent Runtime (QStash steps + GitHub API + PR flow)
M8  Insights Dashboard (pure DB aggregation, no LLM)
M9  Notifications (QStash scheduled + Nodemailer)
M10 Hardening pass (error states, empty states, rate limits, monitoring)
```

Each milestone below has: **scope**, **explicit exclusions** (so scope doesn't creep), and **exit criteria** (how you know it's done and safe to move on).

---

### 3. M0 — Frontend shell + design system implementation

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

**Scope:** build screens 1–18 plus the two flagged-missing screens (Proposals list, Clients list) using static/mock data objects that match the real DB types. Each screen's mock data should be shaped exactly like what the eventual Supabase query will return, so wiring in M3+ is a data-source swap, not a rebuild.

Also: since no error states exist yet (Section 6 open question), design and build at least one error/empty state per screen now, while it's cheap — before real integrations exist to complicate it.

**Exclusions:** no real backend calls. No Chrome extension (that's M2).

**Exit criteria:** you can click through the entire web app, every screen, every state (loading/empty/error/populated), with nothing wired to Supabase yet.

---

### 5. M2 — Chrome extension screens (19–25)

**Scope:** first, write and verify the 7 Claude Design prompts listed in the handoff's Artifact 2, against the feature spec, same format as screens 1–18. Then scaffold the Plasmo extension project and build all 7 screens against mock data, matching the web app's shared primitives where reusable (state chips, epistemic grammar rows) — consider a shared `packages/ui` if using a monorepo, or a copied/synced component set if not (decide based on how much divergence the 380px popup constraint forces).

**Exclusions:** no real Upwork DOM scraping yet, no real LLM calls.

**Exit criteria:** extension popup navigable through all states (signed-out, loading, not-on-job-page, full/low/insufficient confidence, in-voice/survey-fallback proposal, insights tab) with mock data.

---

### 6. M3 — Supabase schema, RLS, auth

**Scope**
- All tables from the handoff (`integrations`, `repos`, `meetings`, `tickets`, `proposals`, `clients`, `client_contacts`, `agent_runs`) as SQL migrations, exact enums and fields as specified, `owner_id` on every table.
- RLS policies: owner-only read/write on every table (no team concept in v1.0, so this is straightforward per-row `owner_id = auth.uid()`).
- Indexes: at minimum on all `owner_id` columns, and on any column used in the confidence-tier or state-machine queries.
- Auth: Supabase Auth with OTP email + Google OAuth + GitHub OAuth, no passwords. GitHub OAuth scope kept as narrow as the "OAuth not GitHub App" decision allows.
- Generate TypeScript types from schema; wire into `lib/db/*` repository functions.

**Exclusions:** no LLM features, no real GitHub PR flow yet (auth only, not repo actions).

**Exit criteria:** you can sign up, sign in via all three methods, and every table round-trips through its repository function with RLS correctly blocking cross-user access (write a quick test for this — it's the one thing that's very expensive to fix later).

---

### 7. M4 — Explain the Client

**Scope**
- Extension content script scrapes Upwork client data.
- `lib/llm/client-analysis.ts` — LangChain chain calling Anthropic, with a Zod-validated structured output schema matching the three confidence tiers.
- Confidence tier logic implemented exactly per the exact triggers in the handoff (≥1 hire AND reviews/spend visible → full; etc.) — this logic should live in a plain deterministic function, NOT be left to the LLM to self-report, since the tier is derived from Upwork data facts, not judgment.
- Price band calc (blend of client history + user rate history, falling back per tier).
- Caching: `clients.last_analyzed_data_hash`, hash-match short-circuit, 30-day soft TTL, manual refresh action.
- Wire into the M2 extension screens (real data replaces mock).

**Exclusions:** proposal drafting, meetings, agent runtime — this milestone is client analysis only.

**Exit criteria:** for a real Upwork job page, the extension shows the correct tier, correct verdict badge, correct price band (or absence of one), and cache correctly short-circuits on a second view of the same unchanged page.

---

### 8. M5 — Proposal Drafter

**Scope**
- pgvector setup inside Supabase; embedding pipeline for imported past proposals (onboarding Screen 1 already covers import UI).
- `lib/llm/proposal-drafter.ts` — retrieval (top-k similar past proposals) + generation chain, in-voice mode.
- Survey-fallback mode when insufficient past-proposal data exists — must never be labeled "in your voice" (hard rule from handoff).
- "Copy & Mark Sent" combined action wired to proposal state machine (`draft → sent`).
- Example/synthetic data auto-hide at 10 resolved proposals.

**Exclusions:** no voice feedback loop (explicitly deferred to post-v1.0 per handoff). No auto-send.

**Exit criteria:** drafting a proposal with <10 historical proposals correctly falls back to survey mode and is visually/textually distinct (Epistemic Grammar synthetic treatment); with ≥10, in-voice mode retrieves and generates correctly; "Copy & Mark Sent" correctly transitions state.

---

### 9. M6 — Meetings pipeline

**Scope**
- Recall.ai Calendar Integration V1 setup; smart auto-join logic (known `client_contacts` emails only).
- Recall webhook receiver → verify signature, fast-ack, send an Inngest event (`meeting/ready-for-processing`) rather than processing inline.
- `inngest/functions/ticketize.ts` — Inngest function triggered by that event; calls the `lib/llm/ticketize.ts` LangChain chain, writes result to `meetings.draft_tickets` jsonb (not the `tickets` table — only promoted after human confirms, per the handoff's explicit rule). Inngest's built-in retry covers transient LLM/API failures here for free.
- Transcript source handling: caption success vs. Whisper fallback (`transcript_source` enum), Whisper batch call when captions are off — this happens inside the same Inngest function, as a separate `step.run("transcribe-fallback")` step so a Whisper failure retries independently of the ticketization step.
- Meeting Draft Review screen (already designed, Screen 7) wired to real data.
- Pre-meeting briefing: on meeting confirmation, trigger `inngest/functions/briefing.ts` which does `step.sleepUntil(meetingStart - 15min)`, then reads from cache (no new LLM call) and delivers via Nodemailer + in-app — known clients only.

**Exclusions:** no live mid-call transcript streaming (explicitly out of scope for v1.0). No auto-generated summaries (draft tickets are the digest, per handoff).

**Exit criteria:** a real test meeting flows scheduled → in_progress → processing → ready, produces correct draft tickets, and a known-client meeting correctly fires the 15-minute-prior briefing email.

---

### 10. M7 — Agent Runtime

**Scope**
- A single `inngest/functions/agent-run.ts` implementing the plan/approve/execute/review loop as one durable function: `step.run("plan")` → `step.waitForEvent("plan-approved", { timeout: ... })` (the Ticket detail → Plan approval screen sends this event on human approval) → `step.run("execute")` → `step.run("review")`. This is the cleanest fit for a human-in-the-loop gate — the function genuinely pauses (no polling, no separate state-machine table needed just to track "waiting for approval").
- GitHub Actions API integration; commit author hard-set to `Agentic OS Agent <agent@agentcos.dev>` regardless of OAuth identity — verify this in a test, since it's a hard requirement, not a default.
- Domain-level retry cap of 3 (distinct from Inngest's own transient-failure retry, per Section 0's note) enforced by attempt-count read from `agent_runs`; the function itself re-enqueues a fresh `agent-run` event for the same ticket on a recoverable failure, checking the count each time, and auto-flags `needs_human` once the cap is hit.
- Cost estimate module: fact row (logged token cost) + prediction row (bucketed by file count vs. past `agent_runs`), with the "no bucket history → no estimate" rule enforced as a real code path, not just a UI placeholder.
- Live console screen (already designed, Screen 10) wired to real execution log via realtime (Supabase Realtime or polling — decide based on how "live" it needs to feel).
- Ticket detail screens (Plan approval, Review/PR) wired to real state.

**Exclusions:** no kanban/board view (explicitly excluded). No inline diff viewer (explicitly excluded).

**Exit criteria:** a real ticket goes through the full loop against a real (test) repo, correctly gates at plan-approval and PR-review, correctly attributes commits, correctly hits `needs_human` after 3 failed attempts on a deliberately-broken test case.

---

### 11. M8 — Insights Dashboard

**Scope:** pure DB aggregation (win/loss patterns, outcome reasons) — no LLM involved, per the handoff. Outcome capture modal (already designed, Screen 13) wired to real writes. Example-data-ON state (Screen 12b) correctly toggles based on the 10-proposal threshold.

**Exit criteria:** dashboard numbers are verifiably correct against seed data you construct by hand (this is the one place you can fully unit-test the aggregation logic).

---

### 12. M9 — Notifications

**Scope:** the 3 fixed triggers (PR ready, needs-human, pre-meeting briefing) fire as Inngest events sent from the agent-run and briefing functions above; a single `inngest/functions/notify.ts` handles delivery via Nodemailer/Gmail SMTP, plus the global opt-in "every ticket status change" (off by default). Settings — Notifications screen (already designed, Screen 16) wired to real preference storage.

**Exit criteria:** all 3 triggers fire correctly in a staged test; opt-in toggle correctly gates the extra notifications.

---

### 13. M10 — Hardening pass

**Scope:** this is where the "no error states designed" gap gets closed for real integrations (webhook failures, Recall bot failed to join, GitHub OAuth error, Whisper fallback failure) — go back through M4–M9 and confirm every failure mode has a designed and built state, not just a console.error. Add basic rate-limit handling on the Anthropic and GitHub APIs. Add minimal monitoring (Vercel logs + a simple alert on `needs_human` accumulation).

**Exit criteria:** you can force each documented failure mode in a staging environment and get a correct, human-readable state on screen — not a blank page or unhandled exception.

---

### 4. STILL-OPEN QUESTIONS TO RESOLVE BEFORE OR DURING M6/M7

Carried over from the original handoff, unresolved by this plan — flag these to Claude rather than letting it assume:
- "Communication style" block in pre-meeting briefing — LLM-generated-and-cached at analysis time, or a user-editable notes field? Needs a decision before M6.
- Pricing page — no model decided; not blocking for build, but the landing page has a dangling nav link.

---

### 5. HOW TO WORK THROUGH THIS WITH CLAUDE

- Work one milestone at a time. Don't let Claude start M(N+1) code until M(N)'s exit criteria are actually met.
- At the start of each milestone, ask Claude to restate the milestone's scope and exclusions back before writing code — cheap check against scope creep.
- Treat the "Exclusions" line per milestone as a hard boundary, not a suggestion — if Claude's implementation starts pulling in a later milestone's concern, stop and split it out.