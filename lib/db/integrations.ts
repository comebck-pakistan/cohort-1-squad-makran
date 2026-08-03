import type { SupabaseClient } from "@supabase/supabase-js";
import type { IntegrationRow } from "@/types/db";
import { decryptSecret } from "@/lib/crypto";

export async function listIntegrations(supabase: SupabaseClient): Promise<IntegrationRow[]> {
  const { data, error } = await supabase.from("integrations").select("*");
  if (error) throw error;
  return data as IntegrationRow[];
}

export async function createIntegration(
  supabase: SupabaseClient,
  row: Omit<IntegrationRow, "id">
): Promise<IntegrationRow> {
  const { data, error } = await supabase.from("integrations").insert(row).select().single();
  if (error) throw error;
  return data as IntegrationRow;
}

export async function updateIntegration(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Omit<IntegrationRow, "id" | "owner_id">>
): Promise<IntegrationRow> {
  const { data, error } = await supabase.from("integrations").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as IntegrationRow;
}

export async function deleteIntegration(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("integrations").delete().eq("id", id);
  if (error) throw error;
}

/** Decrypted GitHub access token for `ownerId`, or null if never connected via OAuth. */
export async function getGithubAccessToken(supabase: SupabaseClient, ownerId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("integrations")
    .select("access_token")
    .eq("owner_id", ownerId)
    .eq("category", "repo")
    .eq("provider", "github")
    .eq("status", "connected")
    .maybeSingle();
  if (error) throw error;
  if (!data?.access_token) return null;
  return decryptSecret(data.access_token);
}
