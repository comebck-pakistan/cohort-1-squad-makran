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
