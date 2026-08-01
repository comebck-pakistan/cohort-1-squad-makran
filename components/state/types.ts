/**
 * State machine enums: exact values from docs/agentic-os-handoff.md §5.
 * These are locked; do not add, rename, or reorder without updating the handoff.
 */
export type TicketState =
  | "backlog"
  | "in_progress"
  | "agent_running"
  | "awaiting_plan_approval"
  | "executing"
  | "review"
  | "changes_requested"
  | "needs_human"
  | "done";

export type ProposalState = "draft" | "sent" | "won" | "lost";
