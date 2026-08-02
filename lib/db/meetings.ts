import type { SupabaseClient } from "@supabase/supabase-js";
import type { MeetingRow } from "@/types/db";

export async function listMeetings(supabase: SupabaseClient): Promise<MeetingRow[]> {
  const { data, error } = await supabase.from("meetings").select("*").order("starts_at", { ascending: true });
  if (error) throw error;
  return data as MeetingRow[];
}

export async function getMeeting(supabase: SupabaseClient, id: string): Promise<MeetingRow | null> {
  const { data, error } = await supabase.from("meetings").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as MeetingRow | null;
}

export async function createMeeting(
  supabase: SupabaseClient,
  row: Omit<MeetingRow, "id">
): Promise<MeetingRow> {
  const { data, error } = await supabase.from("meetings").insert(row).select().single();
  if (error) throw error;
  return data as MeetingRow;
}

export async function updateMeeting(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Omit<MeetingRow, "id" | "owner_id">>
): Promise<MeetingRow> {
  const { data, error } = await supabase.from("meetings").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as MeetingRow;
}

export async function deleteMeeting(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) throw error;
}
