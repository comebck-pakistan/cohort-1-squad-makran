/**
 * Hand-written placeholder types, shaped to match docs/agentic-os-handoff.md §5
 * exactly (table names, owner_id, enum values, jsonb fields). This file exists
 * so M1 mock data and M3+ real Supabase data share one shape. M3 will replace
 * it with `supabase gen types typescript` output; feature types should narrow
 * those generated types, not this file, once that happens.
 *
 * Field names called out explicitly in the handoff are locked. Anything not
 * spelled out there (ids, timestamps, titles) is a reasonable UI-driven
 * addition and may be trued up against the real schema in M3.
 */
import type { TicketState, ProposalState } from "@/components/state/types";

export type ConfidenceTier = "full" | "low" | "insufficient";
export type Verdict = "BID" | "NO-BID" | "MAYBE" | "New · Unverified";

export interface ClientContactRow {
  id: string;
  owner_id: string;
  client_id: string;
  email: string;
  name: string | null;
}

export interface ClientRow {
  id: string;
  owner_id: string;
  name: string;
  upwork_url: string | null;
  confidence_tier: ConfidenceTier;
  verdict: Verdict | null;
  price_band_min: string | null;
  price_band_max: string | null;
  price_band_low_confidence: boolean;
  hires_count: number;
  jobs_won: number;
  jobs_lost: number;
  reviews_visible: boolean;
  spend_visible: boolean;
  payment_verified: boolean;
  last_analyzed_data_hash: string | null;
  last_analyzed_at: string | null;
  created_at: string;
}

export type IntegrationCategory = "repo" | "calendar";
export type IntegrationProvider = "github" | "gitlab" | "google_calendar";
export type IntegrationStatus = "connected" | "error" | "disconnected";

export interface IntegrationRow {
  id: string;
  owner_id: string;
  category: IntegrationCategory;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  connected_at: string | null;
  account_label: string | null;
}

export interface RepoRow {
  id: string;
  owner_id: string;
  integration_id: string;
  provider: IntegrationProvider;
  full_name: string;
  is_default: boolean;
}

export type MeetingSource = "bot_recall" | "manual_paste" | "manual_upload";
export type TranscriptSource = "caption" | "whisper_fallback" | "manual";
export type MeetingStatus = "scheduled" | "in_progress" | "processing" | "ready" | "failed";

export interface DraftTicket {
  title: string;
  description: string;
}

export interface MeetingRow {
  id: string;
  owner_id: string;
  client_id: string | null;
  title: string;
  source: MeetingSource;
  transcript_source: TranscriptSource | null;
  status: MeetingStatus;
  recall_bot_id: string | null;
  draft_tickets: DraftTicket[];
  starts_at: string;
  known_client: boolean;
  guest_email: string | null;
}

export interface TicketRow {
  id: string;
  owner_id: string;
  client_id: string | null;
  repo_id: string | null;
  title: string;
  plan_summary: string | null;
  state: TicketState;
  pr_url: string | null;
  attempt_count: number;
  created_at: string;
  updated_at: string;
}

export interface AgentRunRow {
  id: string;
  owner_id: string;
  ticket_id: string;
  attempt_number: number;
  files_touched_count: number;
  token_cost: number;
  created_at: string;
}

export type OutcomeReasonLost =
  | "Price too high"
  | "Went with someone else"
  | "No response"
  | "Scope mismatch"
  | "Other";

export type OutcomeReasonWon =
  | "Selected on merit"
  | "Referred / relationship"
  | "Price matched budget";

export interface ProposalRow {
  id: string;
  owner_id: string;
  client_id: string | null;
  title: string;
  state: ProposalState;
  in_voice: boolean;
  body: string;
  sent_at: string | null;
  outcome_reason: OutcomeReasonLost | OutcomeReasonWon | null;
  created_at: string;
}
