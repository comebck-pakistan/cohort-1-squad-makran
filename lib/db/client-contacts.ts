import type { SupabaseClient } from "@supabase/supabase-js";
import type { ClientContactRow } from "@/types/db";

export async function listClientContacts(
  supabase: SupabaseClient,
  clientId: string
): Promise<ClientContactRow[]> {
  const { data, error } = await supabase.from("client_contacts").select("*").eq("client_id", clientId);
  if (error) throw error;
  return data as ClientContactRow[];
}

export async function createClientContact(
  supabase: SupabaseClient,
  row: Omit<ClientContactRow, "id">
): Promise<ClientContactRow> {
  const { data, error } = await supabase.from("client_contacts").insert(row).select().single();
  if (error) throw error;
  return data as ClientContactRow;
}

export async function deleteClientContact(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("client_contacts").delete().eq("id", id);
  if (error) throw error;
}
