import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExtensionTokenRow } from "@/types/db";

export async function getExtensionToken(supabase: SupabaseClient, ownerId: string): Promise<ExtensionTokenRow | null> {
  const { data, error } = await supabase.from("extension_tokens").select("*").eq("owner_id", ownerId).maybeSingle();
  if (error) throw error;
  return data as ExtensionTokenRow | null;
}

/** One row per owner: regenerating replaces the previous token (old one stops working). */
export async function setExtensionToken(
  supabase: SupabaseClient,
  ownerId: string,
  token: string
): Promise<ExtensionTokenRow> {
  const { data, error } = await supabase
    .from("extension_tokens")
    .upsert({ owner_id: ownerId, token }, { onConflict: "owner_id" })
    .select()
    .single();
  if (error) throw error;
  return data as ExtensionTokenRow;
}

/** Service-role lookup: the extension API route has no session, only this Bearer token. */
export async function findOwnerByExtensionToken(supabase: SupabaseClient, token: string): Promise<string | null> {
  const { data, error } = await supabase.from("extension_tokens").select("owner_id").eq("token", token).maybeSingle();
  if (error) throw error;
  return data?.owner_id ?? null;
}
