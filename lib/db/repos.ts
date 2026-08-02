import type { SupabaseClient } from "@supabase/supabase-js";
import type { RepoRow } from "@/types/db";

export async function listRepos(supabase: SupabaseClient): Promise<RepoRow[]> {
  const { data, error } = await supabase.from("repos").select("*");
  if (error) throw error;
  return data as RepoRow[];
}

export async function createRepo(supabase: SupabaseClient, row: Omit<RepoRow, "id">): Promise<RepoRow> {
  const { data, error } = await supabase.from("repos").insert(row).select().single();
  if (error) throw error;
  return data as RepoRow;
}

export async function setDefaultRepo(supabase: SupabaseClient, id: string): Promise<void> {
  const { error: clearError } = await supabase
    .from("repos")
    .update({ is_default: false })
    .neq("id", id);
  if (clearError) throw clearError;
  const { error } = await supabase.from("repos").update({ is_default: true }).eq("id", id);
  if (error) throw error;
}

export async function deleteRepo(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("repos").delete().eq("id", id);
  if (error) throw error;
}
