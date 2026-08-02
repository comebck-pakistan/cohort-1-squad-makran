import type { SupabaseClient } from "@supabase/supabase-js";
import type { TicketRow } from "@/types/db";

export async function listTickets(supabase: SupabaseClient): Promise<TicketRow[]> {
  const { data, error } = await supabase.from("tickets").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as TicketRow[];
}

export async function getTicket(supabase: SupabaseClient, id: string): Promise<TicketRow | null> {
  const { data, error } = await supabase.from("tickets").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as TicketRow | null;
}

export async function createTicket(
  supabase: SupabaseClient,
  row: Omit<TicketRow, "id" | "created_at" | "updated_at">
): Promise<TicketRow> {
  const { data, error } = await supabase.from("tickets").insert(row).select().single();
  if (error) throw error;
  return data as TicketRow;
}

export async function updateTicket(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Omit<TicketRow, "id" | "owner_id" | "created_at">>
): Promise<TicketRow> {
  const { data, error } = await supabase
    .from("tickets")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as TicketRow;
}

export async function deleteTicket(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("tickets").delete().eq("id", id);
  if (error) throw error;
}
