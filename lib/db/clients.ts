import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientRow } from "@/types/db";

export async function listClients(supabase: SupabaseClient): Promise<ClientRow[]> {
  const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data as ClientRow[];
}

export async function getClient(supabase: SupabaseClient, id: string): Promise<ClientRow | null> {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as ClientRow | null;
}

export async function createClientRow(
  supabase: SupabaseClient,
  row: Omit<ClientRow, "id" | "created_at">
): Promise<ClientRow> {
  const { data, error } = await supabase.from("clients").insert(row).select().single();
  if (error) throw error;
  return data as ClientRow;
}

export async function updateClientRow(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Omit<ClientRow, "id" | "owner_id" | "created_at">>
): Promise<ClientRow> {
  const { data, error } = await supabase.from("clients").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as ClientRow;
}

export async function deleteClient(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}
