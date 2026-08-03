---
## AGENTIC OS — CONTEXT HANDOFF

---

### 1. PROJECT / GOAL

Building "Solvo for Freelancers" — a two-surface product (Next.js web app + Chrome extension) that takes a freelancer from a job posting to a merged PR. The five core features are: Explain the Client (Upwork client analysis + bid verdict), Voice-of-Past-Wins Proposal Drafter, Meetings → Tickets Pipeline (Recall.ai bot + transcript → draft tickets), Agent Runtime (GitHub Actions + plan/approve/execute/review loop), and Conversion Intelligence Dashboard (win/loss pattern analysis). Design philosophy: honest about confidence and data sufficiency, never fakes certainty, human approves at every meaningful gate. v1.0 is solo-only, no teams.

---

### 2. CURRENT STATUS

**Done:**
- Feature spec finalized (v1.0, all decisions resolved, no open items)
- Design system created (design-system.md, full token/component/grammar spec)
- All 18 web app screens designed and approved in Claude Design
- Sign In and Sign Up pages designed and approved
- Landing page designed and approved
- Tech stack decided and documented
- Deployment strategy decided (all free tier)

**In progress:**
- Nothing. Design phase 100% complete.

**Next:**
- Start building. Recommended order:
  1. Supabase schema (tables, enums, RLS)
  2. Auth (OTP email + Google + GitHub OAuth)
  3. Onboarding flow (3 screens)
  4. Explain the Client (extension content script + LLM + caching)
  5. Proposal Drafter (pgvector embeddings + retrieval + generation)
  6. Meetings pipeline (Recall.ai + webhook + ticketization)
  7. Agent runtime (Inngest steps + GitHub Actions API + PR flow)
  8. Insights dashboard (DB aggregation, no LLM)
  9. Notifications (Inngest scheduled + Resend)

- 7 Chrome extension screens still need to be designed (Screens 19–25). These were planned but not yet prompted into Claude Design. See Section 7 for the prompt list.

---

### 3. KEY DECISIONS MADE

- **owner_id not user_id** on every table — allows future workspace concept without migration
- **OAuth (not GitHub App)** for GitHub integration — simpler, tradeoff accepted: broad repo scope, PRs appear under user's account. Mitigation: git commit author set to `Solvo Agent <agent@solvo.dev>`
- **Recall.ai** for meeting bot (not Skribby, not self-hosted Attendee) — native caption transcription removes per-minute AI transcription cost, only bot-usage fee applies
- **Recall.ai Calendar Integration V1** (not V2) — simpler, Recall handles scheduling lifecycle
- **pgvector inside Supabase** instead of Qdrant — eliminates a separate service, same result for proposal embedding similarity search
- **No proposal voice feedback loop in v1.0** — avoids echo-chamber/voice-drift risk, revisit post-v1.0
- **No auto-bidding ever** — ToS + financial risk, roadmap-only
- **No live transcript streaming mid-call in v1.0** — Recall delivers async via webhook after call ends
- **No auto-generated meeting summaries in v1.0** — draft tickets ARE the digest
- **Draft tickets stored as jsonb array on meetings row** — only written to tickets table after human confirms
- **Confidence tiers (3 levels)** for Explain the Client: Full analysis / Low confidence / Insufficient data — never force false verdict
- **"Copy & Mark Sent" is one combined action** — reduces friction, keeps proposal state machine fed
- **Inngest** for agent runtime — durable functions, built-in retry, step functions map to plan/approve/execute/review loop
- **Hard retry cap: 3 attempts** before ticket auto-flags needs_human
- **Smart auto-join policy** (not blanket, not always-suggest) — bot auto-joins only for known client_contacts emails, all others surface as one-click suggestions
- **Synthetic/example data** auto-hides at 10 resolved proposals, never blended with real data
- **Passwordless auth** — 5-digit OTP email code + Google OAuth + GitHub OAuth, no passwords
- **Epistemic Grammar** as the product's visual signature — Fact (●), Prediction (≈ range + evidence), Synthetic (hatch pattern + pill)

---

### 4. CONSTRAINTS & PREFERENCES

**Tech stack (locked):**
- Frontend: Next.js 16 App Router + TypeScript
- Database + Auth + Realtime: Supabase (free tier)
- Agent runtime: Inngest (free tier)
- LLM: Anthropic API via Vercel AI SDK
- Vector search: pgvector inside Supabase
- Email: Resend (free tier)
- Meeting bot: Recall.ai
- Chrome extension: Plasmo framework
- Deployment: Vercel (free hobby tier)

**Design system (locked):**
- Fonts: Space Grotesk (display), IBM Plex Sans (body/UI), IBM Plex Mono (data/mono)
- Color tokens: --base #F4F6F9, --panel #FFFFFF, --signal #3A43E4, --verified #17835A, --risk #C23A3F, --predict #B26A0A, --console-bg #12161D
- Epistemic Grammar must be applied everywhere a value appears
- Dark console surface used ONLY for agent live execution log
- Extension: 380px wide popup, --shadow-pop, --r-xl

**Hard requirements:**
- Human approval gate at every meaningful decision (plan, PR, meeting confirmation, ticket creation, won/lost capture)
- Never fake certainty — predictions always shown as ranges with evidence, absent evidence means no estimate shown
- Synthetic data never blended with real data
- Survey-fallback proposals never labeled "in your voice"
- No auto-bidding, no auto-send of proposals
- Commits always attributed to `Solvo Agent <agent@solvo.dev>` regardless of OAuth identity

**Things to avoid:**
- No Qdrant (use pgvector)
- No Zoom/Google OAuth (Recall.ai only needs a meeting link)
- No team/org/invite UI in v1.0
- No password auth
- No kanban/board view on tickets
- No inline code diff viewer
- No analytics beyond what's in the Conversion Intelligence Dashboard spec

---

### 5. IMPORTANT FACTS / DATA

**Product name:** Solvo for Freelancers
**Version:** v1.0
**Surfaces:** Web command center (Next.js) + Chrome extension (Plasmo, Upwork only)

**State machines:**
- Ticket: `backlog → in_progress → agent_running → awaiting_plan_approval → executing → review → done` + `changes_requested` (loops to executing) + `needs_human` (terminal)
- Proposal: `draft → sent → won / lost`
- Meeting status: `scheduled → in_progress → processing → ready / failed`

**Schema table names (exact):**
`integrations`, `repos`, `meetings`, `tickets`, `proposals`, `clients`, `client_contacts`, `agent_runs`

**Key schema fields (exact):**
- All tables keyed by `owner_id` (not `user_id`)
- `meetings.source` enum: `('bot_recall', 'manual_paste', 'manual_upload')`
- `meetings.transcript_source` enum: `('caption', 'whisper_fallback', 'manual')`
- `meetings.status` enum: `('scheduled', 'in_progress', 'processing', 'ready', 'failed')`
- `meetings.draft_tickets` type: `jsonb`
- `meetings.recall_bot_id` nullable
- `integrations.category` enum: `('repo', 'calendar')`
- `integrations.provider` enum: `('github', 'gitlab', 'google_calendar', ...)`
- `repos.provider` denormalized (not just via join)
- `repos.is_default` boolean

**Git commit identity:** `Solvo Agent <agent@solvo.dev>`

**Confidence tier triggers (exact from spec):**
- Full analysis: ≥1 hire AND (reviews visible OR spend history visible)
- Low confidence: payment verified but 0 hires, OR hires exist but reviews/spend hidden
- Insufficient data: payment not verified AND 0 hires AND no spend history

**Price band calc:** blend of (a) client's historical rates paid + (b) user's own rate history. Falls back to (b) alone under Low/Insufficient tiers.

**Caching:** `clients` table stores `last_analyzed_data_hash`. Hash match → serve cache. Hash differs → re-run LLM. Soft 30-day TTL backstop. Manual "Refresh Analysis" always available.

**Recall.ai fallback:** if captions off → backend auto-routes audio through OpenAI Whisper batch API (~$0.006/min). `transcript_source` = `whisper_fallback`.

**Auto-join logic:** bot auto-sent only when calendar event guest list includes email in `client_contacts` for existing client. All others → one-click suggestion.

**Cost estimate buckets:** bucketed by number of files the Plan states it will touch, averaged against `agent_runs.token_cost` from past completed runs in same bucket. No bucket history → no estimate shown (never fabricate).

**Outcome reason dropdown values (exact):** "Price too high" · "Went with someone else" · "No response" · "Scope mismatch" · "Other" (for lost) / "Selected on merit" · "Referred / relationship" · "Price matched budget" (for won — implied from dashboard data)

**Example data threshold:** auto-hides at 10 resolved proposals.

**Pre-meeting briefing:** fires 15 min before meeting, only for known clients, reads from cache (no new LLM call), sends via Resend + in-app.

**Notifications (3 fixed triggers):**
1. Agent PR ready for review (ticket → review)
2. Agent stuck / needs human (ticket → needs_human)
3. Pre-meeting prep briefing (15 min before known-client meeting)
Global opt-in: every ticket status change (off by default).

**Free tier limits:**
- Supabase: 500MB storage, 2GB bandwidth
- Inngest: 50,000 runs/month
- Resend: 3,000 emails/month, 100/day
- Vercel: unlimited hobby projects

**Folder structure (exact):**
````
agentic-os/
├── app/
│   ├── (auth)/sign-in/page.tsx
│   ├── (auth)/sign-up/page.tsx
│   ├── (app)/home/page.tsx
│   ├── (app)/meetings/page.tsx
│   ├── (app)/tickets/page.tsx
│   ├── (app)/tickets/[id]/page.tsx
│   ├── (app)/proposals/page.tsx
│   ├── (app)/insights/page.tsx
│   ├── (app)/clients/[id]/page.tsx
│   ├── (app)/settings/page.tsx
│   └── api/
│       ├── webhooks/recall/route.ts
│       ├── webhooks/github/route.ts
│       └── inngest/route.ts
├── inngest/
│   ├── client.ts
│   └── functions/
│       ├── agent-plan.ts
│       ├── agent-execute.ts
│       ├── ticketize.ts
│       └── briefing.ts
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   ├── anthropic.ts
│   └── recall.ts
├── extension/
│   ├── popup.tsx
│   ├── contents/upwork.tsx
│   └── background.ts
└── supabase/
    └── migrations/
````

---

### 6. OPEN QUESTIONS / UNRESOLVED ISSUES

- **Chrome extension screens 19–25 not yet designed.** Prompts were planned but never sent to Claude Design. Screens needed: Explain the Client (Full analysis / Low confidence / New·Unverified), Proposal Drafter (in-voice / survey-fallback), Insights tab, Utility states (signed-out / loading / not on job page).
- **Proposals page (web app) not designed.** The nav rail includes "Proposals" but no screen was prompted. Needs: proposal list with state chips, draft/sent/won/lost filters, link to outcome capture modal.
- **Clients list page not designed.** Client detail (Screen 17) exists but there's no clients index/list screen.
- **No error states designed** for any screen (e.g. webhook failure, Recall.ai bot failed to join, GitHub OAuth error, Whisper fallback failure).
- **"Communication style" block in pre-meeting briefing** — resolved 2026-08-04: user-editable notes field per client (`clients.communication_notes`), not LLM-generated. Freelancer edits it inline from the briefing screen.

---

### 7. LATEST ARTIFACTS

#### ARTIFACT 1: design-system.md (complete, locked)

````markdown
# Solvo for Freelancers — Design System v1.0

> Paste this document into Claude Design before any screen prompt.

---

## 0. Design thesis

The product's soul is **honesty about its own confidence and data sufficiency**. The system's single signature is the **Epistemic Grammar**: every value is marked as a **fact** (exact), a **prediction** (range + evidence), or **synthetic** (example data, never mixed with real). Confidence is never faked, and every human approval point is visibly a gate.

Aesthetic register: an **honest instrument panel**. Calm, cool-toned workspace for the human. One reserved **dark console surface** — used only for the agent's live execution log.

Anti-goals: cream + serif + terracotta; all-black + neon-green; broadsheet hairlines.

---

## 1. Color tokens

### Neutrals
| Token | Hex | Use |
|---|---|---|
| `--base` | `#F4F6F9` | App background |
| `--panel` | `#FFFFFF` | Cards, primary surfaces |
| `--panel-2` | `#FBFCFD` | Inset / muted / empty-state fills |
| `--border` | `#E2E7EE` | Hairline dividers |
| `--border-strong` | `#CED5DF` | Input borders |
| `--ink` | `#141A22` | Primary text |
| `--ink-2` | `#3E4A59` | Secondary text |
| `--ink-3` | `#6B7787` | Tertiary / muted |
| `--ink-4` | `#9AA5B2` | Placeholder, disabled |

### Brand + semantic
| Token | Hex | Meaning |
|---|---|---|
| `--signal` | `#3A43E4` | Primary action, active |
| `--signal-ink` | `#2A31B8` | Hover/pressed |
| `--signal-tint` | `#ECEDFC` | Signal backgrounds |
| `--verified` | `#17835A` | Fact/success: BID, Won, Done |
| `--verified-tint` | `#E4F3EC` | |
| `--risk` | `#C23A3F` | Stop/negative: NO-BID, Lost, Failed |
| `--risk-tint` | `#F8E7E7` | |
| `--predict` | `#B26A0A` | Uncertain: estimates, MAYBE, gates |
| `--predict-tint` | `#FBEFDB` | |

### Console (agent-only)
| Token | Hex |
|---|---|
| `--console-bg` | `#12161D` |
| `--console-panel` | `#1A1F28` |
| `--console-border` | `#262D38` |
| `--console-text` | `#C6D0DC` |
| `--console-dim` | `#7C8794` |
| `--console-signal` | `#8A93FF` |
| `--console-ok` | `#6BE0B0` |

---

## 2. Typography

- **Display — Space Grotesk** (500, 700). Headings, big numbers, verdict labels.
- **Body / UI — IBM Plex Sans** (400, 500, 600).
- **Data / Mono — IBM Plex Mono** (400, 500). Timestamps, prices, state chips, log lines.

### Scale
| Role | Size/lh | Face/weight |
|---|---|---|
| Display XL | 40/44 | Space Grotesk 700 |
| Display L | 30/36 | Space Grotesk 700 |
| H1 | 24/30 | Space Grotesk 500 |
| H2 | 19/26 | Space Grotesk 500 |
| H3 | 16/22 | Plex Sans 600 |
| Body | 14/22 | Plex Sans 400 |
| Body-medium | 14/22 | Plex Sans 500 |
| Small | 13/20 | Plex Sans 400 |
| Caption | 12/16 | Plex Sans 500, --ink-3, +0.02em, UPPERCASE for eyebrows |
| Mono-data | 13/20 | Plex Mono 500 |
| Mono-log | 12.5/20 | Plex Mono 400 |

---

## 3. Spacing, radius, elevation

- **Spacing:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px
- **Radius:** --r-sm 6 · --r-md 8 · --r-lg 10 · --r-xl 12 · --r-pill 999
- **Elevation:** prefer 1px --border over shadow. --shadow-sm: 0 1px 2px rgba(20,26,34,.06). --shadow-pop: 0 8px 28px rgba(20,26,34,.14)
- **Grid:** 12-col, 1120–1280 max, 24 gutters, left nav rail 240px

---

## 4. Epistemic Grammar (signature)

### 4a. Fact
- Leading marker: solid ● in --ink (or --verified for success facts)
- Value in Space Grotesk / Plex Mono, full --ink
- Example: `● $0.18 spent · logged`

### 4b. Prediction
- Leading marker: `≈` in --predict
- Value as a RANGE: `≈ $0.40–$1.20`
- Always discloses evidence: `based on 6 past runs of similar scope`
- Container: --predict-tint fill OR 1px dashed --predict border
- No evidence → line does not render. Show: `Not enough history yet — no estimate shown.` in --ink-3

### 4c. Synthetic
- Background: diagonal hatch (2px lines, --border on --panel-2, ~6% opacity)
- Persistent `EXAMPLE DATA` pill (Caption, --ink-3) pinned to container corner
- Reduced saturation inside
- Never blended with real data. Disappears entirely at threshold.

### 4d. Confidence tiers
3-segment signal-strength meter + label:
- Full analysis — 3/3 segments --verified. Full verdict + full price band.
- Low confidence — 1–2/3 --predict. Verdict tagged "Low confidence" + missing-data note. Price band from user rate only.
- Insufficient data — 0/3 empty. NO verdict badge. "New · Unverified" state, raw facts only.

### 4e. Human-gate marker
Left 3px --predict accent bar on card + `● Action needed` (Caption, --predict). Applied everywhere flow pauses for human decision.

---

## 5. Components

### Buttons
- Primary: --signal fill, white, --r-md, 40px, Plex Sans 500
- Secondary: --panel, --border-strong 1px, --ink
- Ghost: no fill/border, --ink-2, hover --panel-2
- Destructive: --risk text on --risk-tint (outline); solid --risk for irreversible
- Console: --console-panel, --console-border, --console-text

### Verdict badge
Pill, Space Grotesk 700, Caption tracking:
- BID: --verified solid, white
- NO-BID: --risk solid, white
- MAYBE: --predict outline on --predict-tint, amber text
- New · Unverified: --ink-3 outline on --panel-2, no fill (colorless by design)

### State chips (Plex Mono 500, --r-sm, 22px)
| State | Treatment |
|---|---|
| backlog | --ink-3 on --panel-2 |
| in_progress | --signal on --signal-tint |
| agent_running | --signal on --signal-tint + pulsing dot |
| awaiting_plan_approval | --predict on --predict-tint + gate marker |
| executing | --signal on --signal-tint + pulsing dot |
| review | --predict on --predict-tint + gate marker |
| changes_requested | --predict on --predict-tint (loop arrow) |
| needs_human | --risk on --risk-tint |
| done | --verified on --verified-tint |

Proposal: draft neutral · sent signal · won verified · lost risk

### Cards
--panel, --border 1px, --r-lg, 20–24px padding, --shadow-sm only when raised.

### Price band
Horizontal track (--panel-2, --border) with filled --signal-tint segment. Plex Mono endpoints.

### Cost estimate module
Two visually distinct rows, never blended:
1. Fact: `● $0.062 · ticketization + plan, logged`
2. Prediction: `≈ $0.40–$1.20 · based on 6 past runs (3–5 files)` in dashed --predict-tint

### Console / live log
--console-bg, --r-xl. Plex Mono. Timestamp --console-dim · step --console-text · current --console-signal pulse · success --console-ok. Auto-scroll + jump-to-latest. Only dark surface in product.

### Notification / briefing card
--panel, left accent bar: --verified (PR ready) · --risk (needs-human) · --signal (briefing).

---

## 6. Motion, icons, accessibility

- Icons: Lucide/Phosphor, 1.5px stroke, 16/20px
- Motion: single pulse for live states, 120–160ms ease, ≤200ms reveals. Respect prefers-reduced-motion.
- AA contrast everywhere. State never by color alone — always glyph+label.

---

## 7. Surface specifics

### Web command center
Left nav rail 240px: Home · Meetings · Tickets · Proposals · Insights · Clients · Settings. Active: --signal text + --signal-tint pill.

### Chrome extension
380px wide, max 600px height, --shadow-pop, --r-xl. Tabs: Client · Proposal · Insights. Single column. Refresh + cache state in header.

---

## 8. Microcopy rules

- Name by what person controls, not system internals
- Buttons = literal outcome, same verb through flow
- Empty states = invitation + next action
- Never claim certainty data doesn't support
- Survey-fallback proposals never labeled "in your voice"
- Estimates always shown as ranges with sample size
````

---

#### ARTIFACT 2: Chrome Extension Screens — Planned but not yet prompted

Screens 19–25 need to be created in Claude Design. Use the same design system. Here are the planned prompts ready to send:

**Screen 19** — Explain the Client: Full analysis (extension)
**Screen 20** — Explain the Client: Low confidence (extension)
**Screen 21** — Explain the Client: New · Unverified (extension)
**Screen 22** — Proposal Drafter: in-voice draft + Copy & Mark Sent (extension)
**Screen 23** — Proposal Drafter: survey-fallback mode (extension)
**Screen 24** — Insights tab (extension)
**Screen 25** — Utility states: signed-out / loading / not on a job page (extension)

These have not been written yet. Ask the new assistant to write and verify each one against the feature spec.

---

#### ARTIFACT 3: Screens completed and approved

| # | Screen | Status |
|---|---|---|
| 1 | Onboarding — Import proposals | ✅ |
| 2 | Onboarding — Style survey | ✅ |
| 3 | Onboarding — Connect tools | ✅ |
| 4 | Home / Command center | ✅ |
| 5 | Meetings overview | ✅ |
| 6 | Add Meeting modal | ✅ |
| 7 | Meeting Draft Review | ✅ |
| 8 | Tickets board | ✅ |
| 9 | Ticket detail — Plan approval | ✅ |
| 10 | Ticket detail — Live console | ✅ |
| 11 | Ticket detail — Review/PR | ✅ |
| 12 | Insights dashboard | ✅ |
| 12b | Insights — Example data ON | ✅ |
| 13 | Outcome capture modal | ✅ |
| 14 | Settings — Rate history | ✅ |
| 15 | Settings — Integrations | ✅ |
| 16 | Settings — Notifications | ✅ |
| 17 | Client detail | ✅ |
| 18 | Pre-meeting briefing | ✅ |
| — | Landing page | ✅ |
| — | Sign In | ✅ |
| — | Sign Up | ✅ |
| 19–25 | Chrome extension screens | ❌ Not started |

---

### 8. SUGGESTED FIRST MESSAGE FOR NEW CHAT

````
I'm building "Solvo for Freelancers" — a Next.js web app + Chrome extension (Plasmo) that takes a freelancer from job posting to merged PR, with a human approval gate at every meaningful step. The full feature spec, design system, and all decisions are locked. Here's the complete context:

[PASTE ENTIRE HANDOFF ABOVE]

Where I need to pick up:

1. Write and verify Claude Design prompts for Chrome extension Screens 19–25 (Explain the Client × 3 states, Proposal Drafter × 2 modes, Insights tab, Utility states) against the feature spec. Use the same design system and verification format used for web screens 1–18.

2. After extension screens are done, help me start building. First task: write the complete Supabase schema as SQL migrations — all tables, enums, RLS policies, and indexes, derived exactly from the feature spec and schema decisions in this handoff. No guessing, no additions beyond what's in the spec.

Do not re-ask decisions already made. Flag anything genuinely ambiguous in the open questions section rather than assuming.
````