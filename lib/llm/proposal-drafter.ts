import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { embedText } from "./embeddings";
import { countEmbeddedProposals, matchProposals } from "@/lib/db/proposals";

const model = openai.chat("gpt-5-nano");

/**
 * Per M3 exit criteria: fewer than 10 embedded past proposals falls back to survey mode.
 * (features.md's "0-1 provided" cold-start number governs the onboarding survey banner only;
 * this threshold governs per-draft retrieval/generation mode and is the one the build plan locks.)
 */
const IN_VOICE_MIN_CORPUS = 10;

export interface VoiceProfile {
  tone: string | null;
  length_preference: string | null;
  opener: string | null;
}

export interface DraftProposalInput {
  supabase: SupabaseClient;
  ownerId: string;
  jobPostText: string;
  voiceProfile?: VoiceProfile;
}

export interface DraftProposalResult {
  body: string;
  inVoice: boolean;
  retrievedProposalIds: string[];
}

export async function draftProposal(input: DraftProposalInput): Promise<DraftProposalResult> {
  const { supabase, ownerId, jobPostText, voiceProfile } = input;
  const corpusSize = await countEmbeddedProposals(supabase, ownerId);

  if (corpusSize < IN_VOICE_MIN_CORPUS) {
    return draftSurveyFallback(jobPostText, voiceProfile);
  }

  const jobEmbedding = await embedText(jobPostText);
  const similar = await matchProposals(supabase, ownerId, jobEmbedding, 3);

  const groundingBlock = similar
    .map((p, i) => `Past proposal ${i + 1} (title: ${p.title}):\n${p.body}`)
    .join("\n\n");

  const { text } = await generateText({
    model,
    system:
      "You draft freelance project proposals in the user's own voice, grounded in their real past " +
      "winning proposals. Match their tone, structure, and typical length from the examples. " +
      "Never invent claims, credentials, or past work not present in the examples or job post.",
    prompt:
      `Here are the freelancer's past winning proposals, for style and content grounding:\n\n${groundingBlock}\n\n` +
      `Now draft a new proposal for this job post:\n\n${jobPostText}`,
    maxRetries: 1,
  });

  return { body: text, inVoice: true, retrievedProposalIds: similar.map((p) => p.id) };
}

async function draftSurveyFallback(
  jobPostText: string,
  voiceProfile: VoiceProfile | undefined
): Promise<DraftProposalResult> {
  const tone = voiceProfile?.tone ?? "Direct and concise";
  const length = voiceProfile?.length_preference ?? "Medium (3-4 paragraphs)";
  const opener = voiceProfile?.opener ?? "Address the client's problem directly";

  const { text } = await generateText({
    model,
    system:
      "You draft freelance project proposals from a short style survey, not real past examples. " +
      "Keep claims generic; never invent specific past projects, clients, or credentials. " +
      "This draft must read as a reasonable starting point, not a personalized, evidence-backed pitch.",
    prompt:
      `Style preferences: tone "${tone}", length "${length}", opening style "${opener}".\n\n` +
      `Draft a proposal for this job post:\n\n${jobPostText}`,
    maxRetries: 1,
  });

  return { body: text, inVoice: false, retrievedProposalIds: [] };
}
