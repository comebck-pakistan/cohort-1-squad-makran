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

/**
 * M9: dedupe by the job's own URL. No client ID is exposed to a logged-out/unauthenticated
 * scrape, so this is job-page-scoped, not a true cross-job client identity. Takes ownerId
 * explicitly (this is called from the extension's API route via the service-role client,
 * which bypasses RLS, so the owner scoping has to happen here instead).
 */
export async function findClientByUpworkUrl(
  supabase: SupabaseClient,
  ownerId: string,
  upworkUrl: string
): Promise<ClientRow | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("upwork_url", upworkUrl)
    .maybeSingle();
  if (error) throw error;
  return data as ClientRow | null;
}

export interface ClientAnalysisPatch {
  name: string;
  confidence_tier: ClientRow["confidence_tier"];
  verdict: ClientRow["verdict"];
  price_band_min: string | null;
  price_band_max: string | null;
  price_band_low_confidence: boolean;
  hires_count: number;
  reviews_visible: boolean;
  spend_visible: boolean;
  payment_verified: boolean;
  last_analyzed_data_hash: string;
  last_analyzed_at: string;
}

/** Insert-or-update by (owner, upwork_url), the M9 analysis endpoint's single write path. */
export async function upsertClientAnalysis(
  supabase: SupabaseClient,
  ownerId: string,
  upworkUrl: string,
  patch: ClientAnalysisPatch
): Promise<ClientRow> {
  const existing = await findClientByUpworkUrl(supabase, ownerId, upworkUrl);
  if (existing) {
    return updateClientRow(supabase, existing.id, patch);
  }
  return createClientRow(supabase, {
    owner_id: ownerId,
    upwork_url: upworkUrl,
    jobs_won: 0,
    jobs_lost: 0,
    ...patch,
  });
}

export async function deleteClient(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw error;
}
