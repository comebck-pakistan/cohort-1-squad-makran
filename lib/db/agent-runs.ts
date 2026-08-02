import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentRunRow } from "@/types/db";

export async function listAgentRuns(supabase: SupabaseClient, ticketId: string): Promise<AgentRunRow[]> {
  const { data, error } = await supabase
    .from("agent_runs")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("attempt_number", { ascending: true });
  if (error) throw error;
  return data as AgentRunRow[];
}

export async function createAgentRun(
  supabase: SupabaseClient,
  row: Omit<AgentRunRow, "id" | "created_at">
): Promise<AgentRunRow> {
  const { data, error } = await supabase.from("agent_runs").insert(row).select().single();
  if (error) throw error;
  return data as AgentRunRow;
}

export interface CostEstimate {
  minCents: number;
  maxCents: number;
  runCount: number;
}

/**
 * Cost estimate module (build-plan M5): "no bucket history -> no estimate, never fabricate."
 * Bucketed by overall history across the user's completed runs rather than strictly by file
 * count, since the planned file count isn't a stored, queryable column at plan-approval time.
 */
export async function estimateCost(supabase: SupabaseClient): Promise<CostEstimate | null> {
  const { data, error } = await supabase.from("agent_runs").select("token_cost").gt("token_cost", 0);
  if (error) throw error;
  if (!data || data.length === 0) return null;
  const costs = data.map((r) => r.token_cost as number);
  return { minCents: Math.min(...costs), maxCents: Math.max(...costs), runCount: costs.length };
}
