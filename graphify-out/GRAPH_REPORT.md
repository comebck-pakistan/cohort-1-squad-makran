# Graph Report - cohort-1-squad-makran  (2026-08-08)

## Corpus Check
- 186 files · ~73,880 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 995 nodes · 2096 edges · 70 communities (57 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b3513da9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- google-calendar.ts
- actions/proposals.ts
- createClient
- InsightsDashboardScreen.tsx
- extension/package.json
- analyze-client/route.ts
- actions/notifications.ts
- TicketDetailScreen.tsx
- db-generated.ts
- MeetingsOverviewScreen.tsx
- compilerOptions
- compilerOptions
- agent-run.ts
- ClientRow
- popup.tsx
- db.ts
- adapt.ts
- PreMeetingBriefingScreen.tsx
- dependencies
- TicketsBoardScreen.tsx
- devDependencies
- ProposalsListScreen.tsx
- Solvo Design System v1.0
- components/page.tsx
- ClientScreen.tsx
- 20260802110649_create_core_tables.sql
- M2 Supabase Schema, RLS, Auth
- Meetings to Tickets Pipeline
- InsightsScreen.tsx
- supabase
- IntegrationsScreen.tsx
- Solvo for Freelancers (v1.0 Feature Spec)
- M5 Agent Runtime
- Recall.ai Meeting Bot (Original Pick)
- M9 Explain the Client (Real Data)
- package.json
- ProposalScreen.tsx
- app/layout.tsx
- rls-test.mjs
- Pre-Meeting Prep Briefing
- M3 Proposal Drafter
- settings/layout.tsx
- (auth)/layout.tsx
- Repo Provider Integration & Binding
- Browser Extension App Icon (letter S mark)
- proxy.ts
- extension_tokens
- notifications
- global.d.ts
- eslint.config.mjs
- lucide-react
- next.config.ts
- react-dom
- zod
- @types/react-dom
- postcss.config.mjs
- Dev Server on Port 3000 Policy
- Branch and Pull Request Contribution Workflow

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 53 edges
2. `ClientRow` - 23 edges
3. `ProposalRow` - 18 edges
4. `listRepos()` - 17 edges
5. `MeetingRow` - 17 edges
6. `Button()` - 16 edges
7. `listProposals()` - 16 edges
8. `compilerOptions` - 16 edges
9. `compilerOptions` - 15 edges
10. `listIntegrations()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `8-Week Price Band Wedge` --semantically_similar_to--> `Price Band Calculation`  [INFERRED] [semantically similar]
  README.md → docs/features.md
- `Real Google Calendar Meeting Detection (Planned)` --semantically_similar_to--> `Per-User GitHub OAuth (replacing shared PAT)`  [INFERRED] [semantically similar]
  PENDING.md → docs/agentic-os-build-plan.md
- `Real Google Calendar Meeting Detection (Planned)` --semantically_similar_to--> `Recall.ai Meeting Bot (Original Pick)`  [INFERRED] [semantically similar]
  PENDING.md → docs/features.md
- `Human Gate Reduction (Assign Agent Removed)` --conceptually_related_to--> `Honesty About Confidence Principle`  [INFERRED]
  PENDING.md → docs/features.md
- `InsightsDashboardScreenProps` --references--> `ProposalRow`  [EXTRACTED]
  features/insights/InsightsDashboardScreen.tsx → types/db.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Honesty-About-Confidence System** — docs_features_honesty_principle, docs_agentic_os_handoff_epistemic_grammar, docs_features_confidence_tiers, docs_features_cost_estimate, docs_features_synthetic_data_handling, docs_features_survey_fallback, pending_communication_notes [INFERRED 0.85]
- **Agent Run Durable Loop Participants** — docs_features_agent_runtime, docs_features_plan_approve_execute_review, docs_features_ticket_state_machine, docs_features_retry_cap, docs_agentic_os_build_plan_agent_runs_log, pending_failure_reason_columns, pending_empty_repo_409 [INFERRED 0.85]
- **Meeting Capture to Ticket Flow** — docs_features_calendar_detection, docs_features_smart_auto_join, docs_features_client_contacts, docs_features_meetings_pipeline, docs_features_draft_then_confirm, docs_features_whisper_fallback, docs_features_pre_meeting_briefing, pending_google_calendar_detection [INFERRED 0.85]

## Communities (70 total, 13 thin omitted)

### Community 0 - "google-calendar.ts"
Cohesion: 0.08
Nodes (57): fail(), GET(), fail(), GET(), addDays(), CalendarWeekView(), CalendarWeekViewProps, clockLabel() (+49 more)

### Community 1 - "actions/proposals.ts"
Cohesion: 0.05
Nodes (47): GithubMark(), GithubMarkProps, OnboardingHeader(), OnboardingHeaderProps, STEPS, Card(), CardProps, ConnectIntegrationsScreen() (+39 more)

### Community 2 - "createClient"
Cohesion: 0.09
Nodes (43): GET(), GET(), ClientDetailPage(), ClientsPage(), HomePage(), PreMeetingBriefingPage(), MeetingDraftReviewPage(), MeetingsPage() (+35 more)

### Community 3 - "InsightsDashboardScreen.tsx"
Cohesion: 0.14
Nodes (15): InsightsPage(), Toggle(), ToggleProps, EXAMPLE_LOST, EXAMPLE_OUTCOMES, EXAMPLE_TREND, EXAMPLE_WON, InsightsDashboardScreen() (+7 more)

### Community 4 - "extension/package.json"
Cohesion: 0.05
Nodes (40): author, dependencies, @fontsource/ibm-plex-mono, @fontsource/ibm-plex-sans, @fontsource/space-grotesk, plasmo, react, react-dom (+32 more)

### Community 5 - "analyze-client/route.ts"
Cohesion: 0.09
Nodes (32): AnalyzeClientPayload, corsHeaders(), OPTIONS(), POST(), SettingsPage(), RateHistoryScreen(), RateHistoryScreenProps, getRateHistory() (+24 more)

### Community 6 - "actions/notifications.ts"
Cohesion: 0.12
Nodes (25): AppGroupLayout(), SettingsNotificationsPage(), AppShell(), AppShellProps, NAV, NavRail(), NavRailProps, handleMarkAllRead() (+17 more)

### Community 7 - "TicketDetailScreen.tsx"
Cohesion: 0.11
Nodes (27): TicketDetailPage(), ConsoleLine, ConsoleLog(), ConsoleLogProps, CostEstimateModule(), CostEstimateModuleProps, EpistemicValue(), EpistemicValueProps (+19 more)

### Community 8 - "db-generated.ts"
Cohesion: 0.11
Nodes (17): OtpCodeInput(), OtpCodeInputProps, SignInScreen(), SignUpScreen(), SocialAuthButtons(), SocialAuthButtonsProps, createClient(), CompositeTypes (+9 more)

### Community 9 - "MeetingsOverviewScreen.tsx"
Cohesion: 0.17
Nodes (14): PageHeader(), PageHeaderProps, DataTable(), DataTableProps, ClientDetailScreen(), ClientsListScreen(), NOW, TIER_LABEL (+6 more)

### Community 10 - "compilerOptions"
Cohesion: 0.07
Nodes (29): extension, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, compilerOptions, allowJs, esModuleInterop (+21 more)

### Community 11 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, baseUrl, esModuleInterop, ignoreDeprecations, isolatedModules, jsx, lib, module (+18 more)

### Community 12 - "agent-run.ts"
Cohesion: 0.05
Nodes (60): { GET, POST, PUT }, POST(), SkribbyStatusUpdateEvent, TERMINAL_FAILURE_STATUSES, verifySignature(), CalendarConnected, inngest, MeetingConfirmed (+52 more)

### Community 13 - "ClientRow"
Cohesion: 0.19
Nodes (18): ClientDetailScreenProps, NOW, ClientsListScreenProps, AttentionTicket, HomeScreenProps, NOW, AddMeetingModalProps, MeetingDraftReviewScreenProps (+10 more)

### Community 14 - "popup.tsx"
Cohesion: 0.13
Nodes (13): PopupShell(), PopupShellProps, TabId, TABS, AutoStatus, ClientVariant, ProposalVariant, ScenarioMode (+5 more)

### Community 15 - "db.ts"
Cohesion: 0.11
Nodes (16): LOST_REASONS, OutcomeCaptureModal(), OutcomeCaptureModalProps, WON_REASONS, mockProposals, DraftTicket, IntegrationCategory, IntegrationProvider (+8 more)

### Community 16 - "adapt.ts"
Cohesion: 0.18
Nodes (15): formatSpent(), GATE_TEXT, toClientScenario(), analyzeClient(), AnalyzeClientResponse, clearStoredToken(), ClientAnalysis, ExtensionAuthError (+7 more)

### Community 17 - "PreMeetingBriefingScreen.tsx"
Cohesion: 0.13
Nodes (14): ConfidenceTag(), ConfidenceTagProps, ConfidenceTier, HEIGHTS, TIERS, PriceBand(), PriceBandProps, StateChip() (+6 more)

### Community 18 - "dependencies"
Cohesion: 0.12
Nodes (17): ai, @ai-sdk/openai, inngest, next, nodemailer, dependencies, ai, @ai-sdk/openai (+9 more)

### Community 19 - "TicketsBoardScreen.tsx"
Cohesion: 0.18
Nodes (15): State, StateChipProps, StateDef, STATES, ProposalState, TicketState, accentFor(), ACTION_STATES (+7 more)

### Community 20 - "devDependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 21 - "ProposalsListScreen.tsx"
Cohesion: 0.14
Nodes (16): Button(), ButtonProps, ButtonVariant, Input, InputProps, AddMeetingModal(), dateInputValue(), Mode (+8 more)

### Community 22 - "Solvo Design System v1.0"
Cohesion: 0.16
Nodes (14): No Em Dashes Rule, agent_runs.log jsonb Append-per-Step, M0 Frontend Shell + Design System, M1 All Web Screens Against Mock Data, agent_runs.token_cost Stored as Integer Cents, Design Color Tokens, Dark Console Surface (Agent Log Only), Solvo Design System v1.0 (+6 more)

### Community 23 - "components/page.tsx"
Cohesion: 0.11
Nodes (16): NOTIFICATION_TYPES, PROPOSAL_STATES, TICKET_STATES, TIERS, VERDICTS, ConsoleButton(), ConsoleButtonProps, ACCENTS (+8 more)

### Community 24 - "ClientScreen.tsx"
Cohesion: 0.21
Nodes (10): PriceBand(), PriceBandProps, Verdict, VerdictBadge(), VerdictBadgeProps, VERDICTS, CLIENT_SCENARIOS, ClientScenario (+2 more)

### Community 25 - "20260802110649_create_core_tables.sql"
Cohesion: 0.42
Nodes (11): agent_runs, client_contacts, clients, integrations, meetings, proposals, repos, auth (+3 more)

### Community 26 - "M2 Supabase Schema, RLS, Auth"
Cohesion: 0.20
Nodes (11): PENDING.md Outstanding Work Tracking Rule, M2 Supabase Schema, RLS, Auth, 6-Digit OTP Floor (GoTrue Constraint), Passwordless Auth (OTP + Google + GitHub), Eight Locked Schema Tables, .env.local Environment Variables, SUPABASE_SERVICE_ROLE_KEY (RLS Bypass for Inngest), Supabase Auth Container Template Race (CLI #4668) (+3 more)

### Community 27 - "Meetings to Tickets Pipeline"
Cohesion: 0.20
Nodes (11): Extension Bearer Token Auth Bridge, M4 Meetings Pipeline, proxy.ts Auth-Gate Path Exclusions, Recall.ai to Skribby Vendor Swap, SKRIBBY_API_KEY / WEBHOOK_SECRET, Draft-Then-Confirm Human-in-the-Loop Flow, Meetings to Tickets Pipeline, Ticket State Machine (+3 more)

### Community 28 - "InsightsScreen.tsx"
Cohesion: 0.22
Nodes (8): Button(), ButtonProps, ButtonVariant, INSIGHTS_SCENARIO, OutcomeRow, ReasonRow, InsightsScreen(), OUTCOME_STYLE

### Community 30 - "IntegrationsScreen.tsx"
Cohesion: 0.16
Nodes (26): SettingsIntegrationsPage(), IntegrationsScreen(), IntegrationsScreenProps, generateExtensionToken(), getExtensionTokenStatus(), requireUser(), connectRepo(), disconnectGithub() (+18 more)

### Community 31 - "Solvo for Freelancers (v1.0 Feature Spec)"
Cohesion: 0.22
Nodes (10): Agentic OS Build Plan v1.0, M6 Insights Dashboard, Agentic OS Context Handoff, Conversion Intelligence Dashboard, Copy Draft & Mark Sent (Combined Action), Proposal State Machine, Solvo for Freelancers (v1.0 Feature Spec), Idea 4 - The Freelancer's Co-Pilot (+2 more)

### Community 32 - "M5 Agent Runtime"
Cohesion: 0.24
Nodes (10): Inngest Owns Every Durable/Scheduled Process, M10 Hardening Pass, M5 Agent Runtime, Agent Runtime, Plan to Approve to Execute to Review Loop, Hard Retry Cap of 3 Attempts, Agent-run Loop Full E2E Verification, createGithubRepo (auto_init repo creation) (+2 more)

### Community 35 - "Recall.ai Meeting Bot (Original Pick)"
Cohesion: 0.33
Nodes (9): Per-User GitHub OAuth (replacing shared PAT), GITHUB_OAUTH_CLIENT_ID / SECRET (Repo-Connect App), M11 Google Calendar OAuth Setup, Calendar-Assisted Meeting Detection (4.7), client_contacts Table, Recall.ai Meeting Bot (Original Pick), Smart Auto-Join Policy, v1.0 Explicit Cut List (+1 more)

### Community 36 - "M9 Explain the Client (Real Data)"
Cohesion: 0.33
Nodes (9): M8 Chrome Extension Screens, M9 Explain the Client (Real Data), Upwork Client Identity/Rate Data Gap, Chrome Extension Screens 19-25, Client Analysis Caching (last_analyzed_data_hash), Confidence Tiers (Full / Low / Insufficient), Explain the Client, Price Band Calculation (+1 more)

### Community 37 - "package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 38 - "ProposalScreen.tsx"
Cohesion: 0.32
Nodes (5): HumanGateBar(), HumanGateBarProps, PROPOSAL_SCENARIOS, ProposalScenario, ProposalScreen()

### Community 40 - "app/layout.tsx"
Cohesion: 0.43
Nodes (4): fontBody, fontDisplay, fontMono, metadata

### Community 41 - "rls-test.mjs"
Cohesion: 0.43
Nodes (6): admin, check(), createConfirmedUser(), main(), sessionFor(), TABLES

### Community 42 - "Pre-Meeting Prep Briefing"
Cohesion: 0.40
Nodes (6): Engineering Principles (Service Layer, Zod, Types from DB), M7 Notifications, SMTP Delivery (Mailpit local, Gmail real), Notifications (3 Fixed Triggers), Pre-Meeting Prep Briefing, notifications_type_check CHECK Constraint Bug

### Community 43 - "M3 Proposal Drafter"
Cohesion: 0.47
Nodes (6): M3 Proposal Drafter, OpenAI-Only LLM Stack Deviation, Locked Tech Stack (Original), pgvector Inside Supabase (not Qdrant), Voice-of-Past-Wins Proposal Drafter, Survey-Fallback Voice Profile

### Community 46 - "Repo Provider Integration & Binding"
Cohesion: 0.40
Nodes (5): Solvo Agent Commit Identity, INTEGRATION_TOKEN_ENCRYPTION_KEY (AES-256-GCM), Repo Provider Integration & Binding, ensureClientRepo (one repo per client), App Renamed to Solvo

### Community 47 - "Browser Extension App Icon (letter S mark)"
Cohesion: 0.83
Nodes (4): Browser Extension App Icon (letter S mark), Brand Identity: Indigo/Blue Gradient Rounded Square, Browser Extension Package (toolbar/store icon asset), Letter S Monogram Glyph

### Community 48 - "proxy.ts"
Cohesion: 0.67
Nodes (3): config, proxy(), PUBLIC_PATHS

### Community 49 - "extension_tokens"
Cohesion: 0.50
Nodes (3): extension_tokens, auth, auth.users

### Community 50 - "notifications"
Cohesion: 0.50
Nodes (3): notifications, auth, auth.users

## Ambiguous Edges - Review These
- `notifications_type_check CHECK Constraint Bug` → `Engineering Principles (Service Layer, Zod, Types from DB)`  [AMBIGUOUS]
  PENDING.md · relation: conceptually_related_to
- `Browser Extension App Icon (letter S mark)` → `Letter S Monogram Glyph`  [AMBIGUOUS]
  extension/assets/icon.png · relation: rationale_for

## Knowledge Gaps
- **287 isolated node(s):** `{ GET, POST, PUT }`, `SkribbyStatusUpdateEvent`, `TICKET_STATES`, `PROPOSAL_STATES`, `VERDICTS` (+282 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `notifications_type_check CHECK Constraint Bug` and `Engineering Principles (Service Layer, Zod, Types from DB)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Browser Extension App Icon (letter S mark)` and `Letter S Monogram Glyph`?**
  _Edge tagged AMBIGUOUS (relation: rationale_for) - confidence is low._
- **Why does `createClient()` connect `createClient` to `google-calendar.ts`, `actions/proposals.ts`, `InsightsDashboardScreen.tsx`, `analyze-client/route.ts`, `actions/notifications.ts`, `TicketDetailScreen.tsx`, `agent-run.ts`, `IntegrationsScreen.tsx`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Why does `Button()` connect `ProposalsListScreen.tsx` to `google-calendar.ts`, `actions/proposals.ts`, `TicketDetailScreen.tsx`, `MeetingsOverviewScreen.tsx`, `ClientRow`, `db.ts`, `PreMeetingBriefingScreen.tsx`, `TicketsBoardScreen.tsx`, `components/page.tsx`, `IntegrationsScreen.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `ClientRow` connect `ClientRow` to `createClient`, `TicketDetailScreen.tsx`, `MeetingsOverviewScreen.tsx`, `db.ts`, `PreMeetingBriefingScreen.tsx`, `ProposalsListScreen.tsx`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `{ GET, POST, PUT }`, `SkribbyStatusUpdateEvent`, `TICKET_STATES` to the rest of the system?**
  _287 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `google-calendar.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07598371777476255 - nodes in this community are weakly interconnected._