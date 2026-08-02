"use server";

import { createClient } from "@/lib/supabase/server";
import { listTickets, getTicket, updateTicket } from "@/lib/db/tickets";
import { listAgentRuns } from "@/lib/db/agent-runs";
import { inngest } from "@/inngest/client";
import type { TicketRow, AgentRunRow } from "@/types/db";

async function requireOwnerId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, ownerId: user.id };
}

export async function fetchTickets(): Promise<TicketRow[]> {
  const { supabase } = await requireOwnerId();
  return listTickets(supabase);
}

export async function fetchTicketDetail(
  ticketId: string
): Promise<{ ticket: TicketRow | null; runs: AgentRunRow[] }> {
  const { supabase } = await requireOwnerId();
  const [ticket, runs] = await Promise.all([getTicket(supabase, ticketId), listAgentRuns(supabase, ticketId)]);
  return { ticket, runs };
}

/** Kicks off the plan/approve/execute/review loop. Resets attempt_count, since this is a fresh run. */
export async function assignAgentToTicket(ticketId: string): Promise<void> {
  const { supabase } = await requireOwnerId();
  await updateTicket(supabase, ticketId, { state: "agent_running", attempt_count: 0, pr_url: null });
  await inngest.send({ name: "ticket/state-changed", data: { ticketId, state: "agent_running" } });
  await inngest.send({ name: "ticket/agent-assigned", data: { ticketId } });
}

/** Same as assign, used from the needs_human terminal state. */
export const reassignAgentToTicket = assignAgentToTicket;

export interface PlanDecisionInput {
  ticketId: string;
  approved: boolean;
  feedback?: string;
}

/** Approve or reject the plan gate. The durable agent-run function is parked in step.waitForEvent for this. */
export async function submitPlanDecision(input: PlanDecisionInput): Promise<void> {
  await requireOwnerId();
  await inngest.send({
    name: "ticket/plan-decision",
    data: { ticketId: input.ticketId, approved: input.approved, feedback: input.feedback ?? null },
  });
}

export interface ReviewDecisionInput {
  ticketId: string;
  approved: boolean;
  feedback?: string;
}

/** Approve & merge, or request changes, at the PR review gate. */
export async function submitReviewDecision(input: ReviewDecisionInput): Promise<void> {
  await requireOwnerId();
  await inngest.send({
    name: "ticket/review-decision",
    data: { ticketId: input.ticketId, approved: input.approved, feedback: input.feedback ?? null },
  });
}
