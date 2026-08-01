# Agentic OS for Freelancers — Finalized v1.0 Features

Status: Draft for approval. Nothing below is built yet — this is the source of truth Claude Code will build against once approved.

---

## 0. Product Summary

A system that takes a freelancer from "here's a job posting" to "here's a merged PR" — client research, proposal drafting, automatic first-hand meeting capture and meeting-to-ticket conversion, and the actual coding work — with a human approving at every meaningful gate. Two surfaces (Chrome extension for Upwork, web app as command center), one backend. The extension never holds state the web app doesn't also own.

Design philosophy running through every feature below: **the product is honest about its own confidence and data sufficiency, never fakes certainty, and never goes fully autonomous without an explicit human approval step in v1.0.**

---

## 1. Account & Data Model (Foundational)

- v1.0 ships solo-only (no team/org UI, no invites, no shared workspaces).
- Every table is keyed by **`owner_id`**, not `user_id` — a deliberate naming choice so a `workspaces` concept can be introduced later by pointing `owner_id` at a workspace instead of a user, without a data migration.
- No org/role/permission system exists in v1.0. This section exists purely to keep the door open, not to build it now.

---

## 2. Feature: Explain the Client (Extension)

**What it does:** analyzes a client's visible Upwork history and the current job post to produce a bid/no-bid verdict and a suggested price band.

### 2.1 Data extraction (free, client-side)
Content script extracts, when visible: payment verification status, total spend, hires count, jobs posted count, member-since date, individual review text, avg hourly rate paid to past hires, and the current job post's own text/budget.

### 2.2 Confidence tiers
The verdict and price band behave differently depending on how much client history is actually visible — never force false confidence.

| Tier | Trigger condition | Behavior |
|---|---|---|
| **Full analysis** | ≥1 hire AND (reviews visible OR spend history visible) | Full BID/NO-BID/MAYBE verdict + full price band (client-rate blend, see 2.4) |
| **Low confidence** | Payment verified but 0 hires, OR hires exist but reviews/spend hidden | Verdict still shown, tagged "Low Confidence" with a one-line note on what's missing. Price band skips the client-rate blend, uses only the user's own rate history |
| **Insufficient data** | Payment not verified AND 0 hires AND no spend history | No verdict badge at all. Distinct "New/Unverified Client" state showing only raw available facts. Price band from user's own rate history only |

### 2.3 Verdict logic
Pure LLM judgment over all extracted context (hiring history, reviews, budget pattern, comms style, job post text) — no rule-based overrides or scoring layer in v1.0.

### 2.4 Price band calculation
Blend of: (a) client's historical hourly rates paid to past hires, and (b) the user's own historical rate for similar job categories. Falls back to (b) alone under Low Confidence / Insufficient Data tiers (see 2.2).

### 2.5 User rate history capture
- Auto-extracted by LLM from the past proposals pasted during onboarding (best-effort parse of any rates mentioned).
- Editable/addable anytime in Settings — a simple `job_category → typical_rate` table, not tied to any single proposal.

### 2.6 Caching (cost control without quality loss)
- `clients` table stores the last synthesis result plus `last_analyzed_data_hash` (hash of the raw extracted facts at analysis time).
- On revisit: re-extract facts (free) → compare hash. **Match** → serve cached synthesis instantly, no LLM call. **Differs** → re-run synthesis, update cache and hash.
- Manual "Refresh Analysis" button always available regardless of hash state.
- Soft 30-day TTL as a backstop in case prompt/model changes should eventually invalidate even unchanged-fact caches.

---

## 3. Feature: Voice-of-Past-Wins Proposal Drafter (Extension)

**What it does:** drafts a proposal for the open job post in the user's own writing voice, grounded in their actual past winning proposals.

### 3.1 Cold start
If the user skips pasting past proposals during onboarding (0-1 provided), a short 2-3 question style survey (tone, preferred length) is asked instead, producing a fallback voice profile (two fields on the user's profile row: `tone`, `length_preference`). No proposal is ever falsely labeled "in your voice" if it was generated from the survey fallback instead of real examples — the UI must distinguish these two generation modes.

### 3.2 Retrieval
Top-3 most semantically similar past proposals (via OpenAI embeddings + Qdrant) to the current job post text. No category tagging or recency weighting in v1.0 — pure similarity search.

### 3.3 Generation
LLM drafts using the retrieved top-3 as style/content grounding. Draft is always editable inline before copy; the tool never has a "Send" action — sending on Upwork is always a manual human action.

### 3.4 Feedback loop
**None in v1.0.** Winning proposals generated by this tool do NOT get auto-embedded back into the voice model. Only the originally-pasted onboarding proposals feed retrieval. This avoids the tool learning from its own generated text (echo-chamber/voice-drift risk) and costs nothing extra to build. Revisit post-v1.0 once there's real Won/Lost volume to evaluate whether drift is an actual problem.

### 3.5 Copy Draft & Mark Sent (combined action)
The extension's "Copy to Clipboard" button on a draft also transitions the proposal's status from `draft` to `sent` in the same click — one action instead of two separate ones (copy, then later find the proposal in the web app to update its status manually). This isn't just convenience: every point of friction in logging an outcome is a proposal that silently never gets marked, which thins the exact dataset the Conversion Intelligence dashboard (Section 6) depends on. No new schema — it's the existing Proposal State Machine (Section 8) triggered from a new place.

---

## 4. Feature: Meetings → Tickets Pipeline (Web App)

**What it does:** captures a client meeting's transcript — automatically and first-hand wherever possible, without requiring the user to manually upload anything after the fact — and converts it into review-ready tickets.

### 4.1 Transcript Acquisition — two paths

**Primary path: Meeting Bot (Recall.ai)**
- Before a call, the user adds it via an "Add Meeting" action: pastes the Zoom/Google Meet link, optionally links a client, sets a scheduled time (or "Join Now" for a call already in progress).
- Backend calls Recall.ai's Create Bot API with that link. The bot joins the call directly as a participant — no host permission needed, works on free Zoom/Meet accounts, no separate Zoom/Google OAuth integration required.
- Recall reads the meeting's native live captions and returns a fully diarized (speaker-labeled) transcript at **no additional transcription charge** — only Recall's per-hour bot-usage fee applies (~$0.50/hr recording, covered by free signup credits through build and demo).
- Delivered **asynchronously via webhook once the call ends.** v1.0 does not stream a live transcript into the UI mid-call — that's a possible later addition, not required to satisfy "first-hand, no manual upload."

**Fallback path: manual paste/upload** (kept, not removed)
- Covers meetings that never went through a bot: phone calls, in-person meetings, or a bot the user simply forgot to schedule.
- Manual paste of transcript text works immediately, no processing needed.
- Manual audio upload is transcribed via OpenAI Whisper batch API (~$0.006/min).

**Graceful degradation between the two:** a real failure mode with caption-based transcription is the meeting host having live captions turned off in Zoom/Meet — the bot still joins, but the caption transcript comes back empty. Recall still has the recorded audio in that case, so the backend automatically re-routes that audio through OpenAI Whisper instead of surfacing a dead end or asking the user to re-upload anything manually. The "first-hand" promise holds even when the ideal path fails silently upstream.

### 4.2 Draft-then-confirm flow (human-in-the-loop)
Tickets are never created directly from a transcript, regardless of which acquisition path produced it. Flow:

1. Transcript ready (via either path above) → LLM generates **draft tickets**, biased toward more/smaller/atomic tickets rather than fewer/larger ones (a human merging two small tickets is lower-effort than splitting one vague one).
2. Drafts stored as a `draft_tickets jsonb` array on the `meetings` row — not in the `tickets` table yet.
3. Draft Review screen: user edits, merges, splits, deletes, reorders.
4. "Confirm & Create Tickets" → only now do rows get written into the real `tickets` table, entering the ticket state machine at `backlog`.

### 4.3 Repo Provider Integration & Binding

**Auth method: OAuth (not a GitHub App) for v1.0.** Simpler and faster to implement — one redirect, one token exchange, no JWT/installation-token machinery. Tradeoff accepted knowingly: the OAuth `repo` scope is broad (covers everything the user's account can access) rather than a curated per-repo grant, and PRs will appear as opened by the user's own GitHub account rather than a distinct bot identity.

**Mitigation (cheap, do it regardless of provider):** the *token/PR* is the user's identity, but the **git commit author/committer** on every commit the agent makes is still set to a distinct identity (e.g. `Agentic OS Agent <agent@yourdomain>`) via a `git config` step before committing. So the commit history inside the PR is honestly attributed to the agent even though the PR wrapper is under the user's account.

**Schema — deliberately provider-agnostic, GitHub is just the first row:**

```
integrations: id, owner_id, provider enum('github', 'gitlab', ...), 
              access_token (encrypted), refresh_token (encrypted, nullable), 
              scope, provider_account_handle, connected_at

repos: id, owner_id, integration_id (FK → integrations), provider enum('github','gitlab',...),
       external_repo_id, full_name, default_branch, is_default, connected_at
```

- `provider` is denormalized onto `repos` (not just inferred via the `integrations` join) so repo-list queries and UI badges don't need a join for something as basic as "which icon to show."
- Only `'github'` is implemented in v1.0; the enum and both tables exist so GitLab (or Bitbucket) is a new `provider` value + a new OAuth callback handler — not a schema rewrite.
- Ticket's `repo_id` defaults to the owner's default repo at confirm-time, overridable per-ticket any time before Agent assignment.
- Decoupling repo from onboarding/client also means repo-per-client or repo-per-project can be added later without a schema rewrite.

### 4.4 Meetings schema (updated for dual acquisition paths)

```
meetings: id, owner_id, client_id (nullable),
          source enum('bot_recall', 'manual_paste', 'manual_upload'),
          meeting_link (nullable, populated for the bot path),
          recall_bot_id (nullable, Recall's bot reference for status polling/webhook matching),
          scheduled_at (nullable), status enum('scheduled','in_progress','processing','ready','failed'),
          transcript_text, transcript_source enum('caption','whisper_fallback','manual'),
          draft_tickets jsonb, created_at
```

`transcript_source` is tracked separately from `source` deliberately — a `bot_recall` meeting can still end up with a `whisper_fallback` transcript if captions were off (see 4.1's degradation case), and that distinction matters later if transcript quality issues ever need debugging.

### 4.5 Transcript retention & linkage
- Full raw transcript retained regardless of acquisition path (needed for the agent's later context and for human review).
- If a client was selected when the meeting was added, the ticket is linked to that client record (so agent runs and Explain-the-Client context can eventually cross-reference).
- No separate LLM-generated meeting summary in v1.0 — the draft tickets themselves are the digest; add a summary field later if review friction shows it's needed.

### 4.6 Why this shape
Manual transcript upload was the original v1.0 plan, but it undercuts the "OS," not "tool you feed" positioning — the founder explicitly wants meetings captured first-hand rather than depending on the user remembering to export and upload something after every call. A meeting-bot approach (evaluated: Recall.ai, Skribby, self-hosted Attendee) achieves this without requiring Zoom/Google OAuth, since the bot only needs a meeting link to join. Recall's native-caption transcription mode was chosen specifically because it removes the recurring per-minute AI-transcription cost that every other option in this category charges, leaving only the bot's own per-hour usage fee — the cheapest sustainable path that's still "real," not a demo hack. Manual paste/upload is retained as a fallback rather than removed, since not every client conversation happens over a joinable video link.

### 4.7 Calendar-Assisted Meeting Detection (Google Calendar)
Removes the last piece of manual friction in 4.1's primary path: instead of pasting a Zoom/Meet link before every call, the user connects their Google Calendar once, and upcoming meetings are detected automatically.

**Mechanism:** Recall.ai's Calendar Integration API (V1 — simpler, Recall handles more of the scheduling lifecycle; V2 is a future upgrade if per-event bot config is ever needed) connects to the user's Google Calendar via OAuth and reads upcoming events with a conferencing link. This is a genuinely free API from the same vendor already providing the meeting bot — no new vendor, no new per-event cost beyond the same bot-usage fee that already applies when a bot actually joins something.

**Auto-join policy — "Smart Auto-Join," not blanket automation:**
- A bot is sent **automatically, no confirmation needed** only when a calendar event's guest list includes an email already on file in `client_contacts` (see below) for an existing client.
- Every other calendar event with a video link surfaces as a **suggestion** in the Meetings area, requiring one click to confirm before a bot is sent.
- This is a deliberate choice, not the simplest option (blanket auto-join to everything) or the most conservative (never auto, always manual) — consistent with the rest of the product's philosophy of never acting on the user's behalf without either an explicit prior trust signal (a known client) or an explicit click.
- **Cold start handled naturally:** the first meeting with any new client won't match anything on file yet, so it correctly surfaces as a one-click suggestion rather than silently auto-joining a stranger's call. Confirming that first meeting and linking it to a client *is* the teaching step — the client's email gets written to `client_contacts`, and every subsequent meeting with that same person auto-joins from then on, with no separate "training" step required.

**Schema additions:**
```
client_contacts: id, client_id, email, added_at

-- extends the integrations table from 4.3:
integrations: ... + category enum('repo', 'calendar')   -- lets 'repo' vs 'calendar' 
                                                           -- integrations be queried without 
                                                           -- hardcoding provider names
              provider enum(..., 'google_calendar')      -- new value added to existing enum
```

---

## 5. Feature: Agent Runtime (Web App + GitHub Actions)

**What it does:** executes an assigned ticket against a real repo and opens a real PR — with observability and approval gates at each stage, not a black box.

### 5.1 Ticket state machine

```
backlog → in_progress → agent_running → awaiting_plan_approval → executing → review → done
                                    ↘ changes_requested ↗ (loops back to executing)
                                    ↘ needs_human (terminal until manually reassigned)
```

### 5.2 Plan → Approve → Execute → Review loop
1. On agent assignment, the agent's first action is never code — it produces a **written Plan** (files it intends to touch, its approach) and posts it to the ticket detail page. Ticket enters `awaiting_plan_approval`.
2. Human clicks **Approve** (proceeds to execution) or **Reject with feedback** (feedback becomes input to a re-plan attempt).
3. On approval, execution runs via GitHub Actions with a live, timestamped step log (checkout → read context → edit file X → run tests → commit → open PR) visible on the ticket detail page in real time — not just a before/after diff.
4. PR opening does **not** auto-complete the ticket. Human either **Approves** (merges, ticket → `done`) or **Requests Changes** (comment feeds back into the next planning attempt, ticket → `changes_requested` → loops to a new plan/execute cycle).
5. Hard retry cap (3 attempts) before the ticket auto-flags `needs_human` and stops consuming tokens autonomously.

### 5.3 Why this shape
Full autopilot (assign → wait → PR appears with no visibility) was explicitly rejected — the founder does not want a black box where drift is discoverable only after the fact. This design gives real-time observability today and a clean on-ramp to autopilot later (a future "skip plan approval for this repo/ticket type" toggle), without building that autonomy into v1.0.

### 5.4 Note on future multi-provider execution
The execution engine in v1.0 is GitHub Actions specifically (checkout → edit → commit → PR via `gh` CLI). If GitLab support is added later (see 4.3), execution would branch on `repos.provider` to use GitLab CI/`glab` instead — the Plan → Approve → Execute → Review *state machine* stays provider-agnostic; only the execution step's implementation is provider-specific. Not built now, just noting where the branch point will live.

### 5.5 Cost Estimate at Plan Approval
Alongside the Plan (5.2, step 1), the ticket detail page shows a cost estimate to inform the Approve/Reject decision — split into what's known vs. what's predicted, never blended into one falsely-precise number:

- **Spent so far (exact):** the ticketization LLM call and the Plan-generation call have already happened by this point, and their token counts are logged precisely — this part of the number is a fact, not an estimate.
- **Estimated execution cost (a range, not a point number):** the code-editing/execution step hasn't run yet, so this is a genuine prediction. Bucketed by the number of files the Plan states it intends to touch (already present in the Plan text — no new LLM call needed to derive it), averaged against `agent_runs.token_cost` from past completed runs in the same file-count bucket. Shown as a range with its sample size disclosed, e.g. *"$0.40–$1.20 estimated, based on 6 past runs of similar scope."*
- **No history for a bucket → no estimate shown at all.** Explicitly no default/generic placeholder number is fabricated to fill the gap — consistent with the Conversion Intelligence dashboard's honesty principle (Section 6.2). The estimate line simply doesn't render until real data exists for that bucket; it fills itself in naturally as runs accumulate.

---

## 6. Feature: Conversion Intelligence Dashboard (Web App + Extension "Insights" tab)

**What it does:** surfaces win-rate patterns and loss reasons from the user's own proposal history.

### 6.1 Outcome reason capture
When a proposal is marked Won/Lost: a **fixed dropdown** (e.g. "Price too high," "Went with someone else," "No response," "Scope mismatch") is required, plus an **optional free-text elaboration** field. Dashboard aggregation runs entirely on the dropdown values (cheap, clean); free text is for the user's own reference only, not parsed by an LLM in v1.0.

### 6.2 Seeded/synthetic data handling
A clearly labeled **"Show example data"** toggle displays a synthetic dataset so the dashboard isn't empty on day one. This toggle **auto-hides once real resolved-proposal count crosses a threshold** (10 resolved proposals) — synthetic and real data are never blended or presented as equivalent.

---

## 7. Feature: Notifications

Three trigger events, delivered via email (Resend) + in-app. A Settings toggle exists to opt into notifications on *every* ticket status change, off by default to avoid noise.

1. **Agent PR ready for review** (ticket reached `review` state)
2. **Agent stuck / needs human** (ticket reached `needs_human` state)
3. **Pre-Meeting Prep Briefing** — 15 minutes before a calendar-synced meeting (see 4.7) with a *known* client, an automatic email/in-app briefing is sent: current bid/no-bid verdict and price band (from Explain the Client, Section 2, served from cache — no new LLM call triggered by this), a short note on communication style, and outcomes of past proposals/tickets with this client. Requires no new data — it's a scheduled read of data already computed by Sections 2, 4, and 6, triggered by the calendar event's start time. Only fires for meetings that matched a known client via `client_contacts` (4.7); a first-time/unknown-contact meeting has nothing to brief on yet, so no briefing is sent for those.

---

## 8. Proposal State Machine

```
draft → sent → won
            ↘ lost
```
`won`/`lost` require the outcome-reason dropdown (Section 6.1) before the transition completes.

---

## 9. Explicit v1.0 Cut List (recap, unchanged from prior discussion)

| Feature | Status |
|---|---|
| Auto-bidding | Cut entirely — ToS + financial risk, roadmap-only |
| Job relevance / job-finding | Cut — needs a separate job-feed ingestion pipeline, out of scope |
| Zoom/Google native marketplace app (an installable "app" inside Zoom's/Meet's own app directory) | Cut — this is a different, heavier integration path than the Recall.ai bot-join now in v1.0 (see 4.1); no Zoom/Google App Marketplace listing planned |
| Live in-UI transcript streaming during an active call | Cut for v1.0 — Recall delivers the transcript asynchronously after the call ends via webhook; a live mid-call view in our own UI is a possible later addition, not required for the "first-hand, no manual upload" goal |
| Proposal voice feedback loop | Cut — see 3.4 |
| Auto-generated meeting summaries | Cut — see 4.5 |

---

## 10. Open Items Before Design/Schema Phase

None outstanding — all founder-level feature decisions above are resolved. Next steps once this doc is approved:
1. Unified design system + per-screen Claude Design prompts (all screens sharing one visual language)
2. Full Postgres schema (tables, enums, RLS policies) reflecting every state machine and table above
3. Milestone breakdown for Claude Code hand-off