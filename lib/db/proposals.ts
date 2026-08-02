import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProposalRow } from "@/types/db";

/** pgvector wire format: "[0.12,0.34,...]" - a bracketed, comma-separated literal, no spaces. */
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function fromDbRow(row: Record<string, unknown>): ProposalRow {
  const embedding = row.embedding;
  return {
    ...row,
    embedding: typeof embedding === "string" ? (JSON.parse(embedding) as number[]) : null,
  } as ProposalRow;
}

function toDbPatch<T extends { embedding?: number[] | null }>(patch: T): Record<string, unknown> {
  if (patch.embedding === undefined) return patch;
  return { ...patch, embedding: patch.embedding === null ? null : toVectorLiteral(patch.embedding) };
}

export async function listProposals(supabase: SupabaseClient): Promise<ProposalRow[]> {
  const { data, error } = await supabase.from("proposals").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromDbRow);
}

export async function getProposal(supabase: SupabaseClient, id: string): Promise<ProposalRow | null> {
  const { data, error } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? fromDbRow(data) : null;
}

export async function createProposal(
  supabase: SupabaseClient,
  row: Omit<ProposalRow, "id" | "created_at">
): Promise<ProposalRow> {
  const { data, error } = await supabase.from("proposals").insert(toDbPatch(row)).select().single();
  if (error) throw error;
  return fromDbRow(data);
}

export async function updateProposal(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Omit<ProposalRow, "id" | "owner_id" | "created_at">>
): Promise<ProposalRow> {
  const { data, error } = await supabase.from("proposals").update(toDbPatch(patch)).eq("id", id).select().single();
  if (error) throw error;
  return fromDbRow(data);
}

export async function deleteProposal(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("proposals").delete().eq("id", id);
  if (error) throw error;
}

export interface SimilarProposal {
  id: string;
  title: string;
  body: string;
  similarity: number;
}

/** Cosine-similarity top-k retrieval over the caller's own past-proposal corpus, via the `match_proposals` RPC. */
export async function matchProposals(
  supabase: SupabaseClient,
  ownerId: string,
  embedding: number[],
  matchCount = 3
): Promise<SimilarProposal[]> {
  const { data, error } = await supabase.rpc("match_proposals", {
    query_embedding: toVectorLiteral(embedding),
    match_owner_id: ownerId,
    match_count: matchCount,
  });
  if (error) throw error;
  return (data ?? []) as SimilarProposal[];
}

/** Count of the owner's embedded past-proposal corpus rows, used to decide in-voice vs. survey-fallback mode. */
export async function countEmbeddedProposals(supabase: SupabaseClient, ownerId: string): Promise<number> {
  const { count, error } = await supabase
    .from("proposals")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .not("embedding", "is", null);
  if (error) throw error;
  return count ?? 0;
}
