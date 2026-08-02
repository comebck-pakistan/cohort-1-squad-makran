"use server";

import { createClient } from "@/lib/supabase/server";
import { createProposal, listProposals, updateProposal } from "@/lib/db/proposals";
import { embedText } from "@/lib/llm/embeddings";
import { draftProposal, type VoiceProfile } from "@/lib/llm/proposal-drafter";
import type { ProposalRow } from "@/types/db";

async function requireOwnerId(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; ownerId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, ownerId: user.id };
}

/**
 * Persists past proposals pasted at onboarding (Screen 1) as `proposals` rows (state "won",
 * no client) and embeds each one so they become part of the in-voice retrieval corpus.
 * Feedback-loop rule (features.md 3.4): only these originally-imported rows ever get embedded,
 * never proposals this tool later generates.
 */
export async function importPastProposals(
  items: { title: string; text: string }[]
): Promise<{ imported: number }> {
  const { supabase, ownerId } = await requireOwnerId();
  const nonEmpty = items.filter((i) => i.text.trim().length > 0);

  for (const item of nonEmpty) {
    const embedding = await embedText(item.text);
    await createProposal(supabase, {
      owner_id: ownerId,
      client_id: null,
      title: item.title.trim() || "Past proposal",
      state: "won",
      in_voice: true,
      body: item.text,
      sent_at: null,
      outcome_reason: null,
      resolved_at: null,
      embedding,
    });
  }

  return { imported: nonEmpty.length };
}

/** Stores the onboarding style survey answers on the user's own auth record (no 9th table needed). */
export async function saveVoiceProfile(profile: VoiceProfile): Promise<void> {
  const { supabase } = await requireOwnerId();
  const { error } = await supabase.auth.updateUser({ data: profile });
  if (error) throw error;
}

export async function getVoiceProfile(): Promise<VoiceProfile> {
  const { supabase } = await requireOwnerId();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = (user?.user_metadata ?? {}) as Partial<VoiceProfile>;
  return {
    tone: meta.tone ?? null,
    length_preference: meta.length_preference ?? null,
    opener: meta.opener ?? null,
  };
}

export interface RequestDraftInput {
  title: string;
  jobPostText: string;
  clientId: string | null;
}

/** Drafts a new proposal (in-voice or survey-fallback, decided inside draftProposal) and saves it as `draft`. */
export async function requestProposalDraft(input: RequestDraftInput): Promise<ProposalRow> {
  const { supabase, ownerId } = await requireOwnerId();
  const voiceProfile = await getVoiceProfile();

  const result = await draftProposal({
    supabase,
    ownerId,
    jobPostText: input.jobPostText,
    voiceProfile,
  });

  return createProposal(supabase, {
    owner_id: ownerId,
    client_id: input.clientId,
    title: input.title,
    state: "draft",
    in_voice: result.inVoice,
    body: result.body,
    sent_at: null,
    outcome_reason: null,
    resolved_at: null,
    embedding: null,
  });
}

/** Copy & Mark Sent, combined action per handoff §2: one click, transitions draft -> sent. */
export async function copyAndMarkSent(proposalId: string): Promise<ProposalRow> {
  const { supabase } = await requireOwnerId();
  return updateProposal(supabase, proposalId, { state: "sent", sent_at: new Date().toISOString() });
}

export async function markProposalOutcome(
  proposalId: string,
  outcome: "won" | "lost",
  outcomeReason: ProposalRow["outcome_reason"]
): Promise<ProposalRow> {
  const { supabase } = await requireOwnerId();
  return updateProposal(supabase, proposalId, {
    state: outcome,
    outcome_reason: outcomeReason,
    resolved_at: new Date().toISOString(),
  });
}

export async function fetchProposals(): Promise<ProposalRow[]> {
  const { supabase } = await requireOwnerId();
  return listProposals(supabase);
}
