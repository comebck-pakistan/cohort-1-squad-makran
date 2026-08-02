/**
 * Row types narrowed from the real generated schema in `db-generated.ts`
 * (Supabase's generator types CHECK-constrained columns as plain `string`,
 * so the literal unions below are layered back on top). Table names, owner_id,
 * and enum values are locked per docs/agentic-os-handoff.md §5.
 */
import type { Database } from "./db-generated";
import type { TicketState, ProposalState } from "@/components/state/types";

export type { Database };

export type ConfidenceTier = "full" | "low" | "insufficient";
export type Verdict = "BID" | "NO-BID" | "MAYBE" | "New · Unverified";

type Tables = Database["public"]["Tables"];

export type ClientRow = Omit<Tables["clients"]["Row"], "confidence_tier" | "verdict"> & {
  confidence_tier: ConfidenceTier;
  verdict: Verdict | null;
};

export type ClientContactRow = Tables["client_contacts"]["Row"];

export type IntegrationCategory = "repo" | "calendar";
export type IntegrationProvider = "github" | "gitlab" | "google_calendar";
export type IntegrationStatus = "connected" | "error" | "disconnected";

export type IntegrationRow = Omit<Tables["integrations"]["Row"], "category" | "provider" | "status"> & {
  category: IntegrationCategory;
  provider: IntegrationProvider;
  status: IntegrationStatus;
};

export type RepoRow = Omit<Tables["repos"]["Row"], "provider"> & {
  provider: IntegrationProvider;
};

export type MeetingSource = "bot_recall" | "manual_paste" | "manual_upload";
export type TranscriptSource = "caption" | "whisper_fallback" | "manual";
export type MeetingStatus = "scheduled" | "in_progress" | "processing" | "ready" | "failed";

export interface DraftTicket {
  title: string;
  description: string;
}

export type MeetingRow = Omit<
  Tables["meetings"]["Row"],
  "source" | "transcript_source" | "status" | "draft_tickets"
> & {
  source: MeetingSource;
  transcript_source: TranscriptSource | null;
  status: MeetingStatus;
  draft_tickets: DraftTicket[];
};

export type TicketRow = Omit<Tables["tickets"]["Row"], "state"> & {
  state: TicketState;
};

export type AgentRunRow = Tables["agent_runs"]["Row"];

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

export type ProposalRow = Omit<Tables["proposals"]["Row"], "state" | "outcome_reason" | "embedding"> & {
  state: ProposalState;
  outcome_reason: OutcomeReasonLost | OutcomeReasonWon | null;
  embedding: number[] | null;
};
