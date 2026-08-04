import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { costCents } from "./agent";
import type { ConfidenceTier, Verdict } from "@/types/db";
import type { RateEntry } from "@/lib/rates";

const model = openai.chat("gpt-5-nano");

export interface PriceBand {
  min: string;
  max: string;
  low: boolean;
  note: string;
}

export interface ClientAnalysisResult {
  verdict: Verdict;
  reasoning: string;
  priceBand: PriceBand | null;
  costCents: number;
}

const analysisSchema = z.object({
  verdict: z.enum(["BID", "NO-BID", "MAYBE"]),
  reasoning: z.string(),
  priceBandMin: z.string().nullable(),
  priceBandMax: z.string().nullable(),
  priceBandNote: z.string(),
});

/**
 * `tier === "insufficient"` is skipped entirely, deterministically: there's nothing for the
 * LLM to reason about beyond the job post itself, and generating a confident-sounding verdict
 * from near-zero client signal would violate the app's "never fabricate" rule. Saves a call too.
 */
export async function analyzeClient(input: {
  jobTitle: string;
  jobDescription: string;
  postedBudget: string | null;
  tier: ConfidenceTier;
  signalsVerified: number;
  rateHistory: RateEntry[];
}): Promise<ClientAnalysisResult> {
  if (input.tier === "insufficient") {
    return {
      verdict: "New · Unverified",
      reasoning: "No client history to evaluate. Proceed only if the job post itself gives you enough confidence.",
      priceBand: null,
      costCents: 0,
    };
  }

  const rateLines = input.rateHistory.length
    ? input.rateHistory.map((r) => `- ${r.category}: ${r.rate} (${r.kind === "fact" ? "confirmed" : "estimate"})`).join("\n")
    : "No rate history recorded yet.";

  const { object, usage } = await generateObject({
    model,
    schema: analysisSchema,
    system:
      "You help a freelancer decide whether to bid on an Upwork job. You only have the job post " +
      "text, the client's publicly visible hire/spend signals, and the freelancer's own past rates. " +
      "You do NOT know this specific client's average rate paid, that data isn't available, never " +
      "invent a number for it. Suggest a price band only from the posted budget and the freelancer's " +
      "own rate history. Be honest about low confidence when the client signal is thin.",
    prompt: [
      `Job title: ${input.jobTitle}`,
      `Job description: ${input.jobDescription}`,
      `Posted budget: ${input.postedBudget ?? "not specified"}`,
      `Client confidence tier: ${input.tier} (${input.signalsVerified}/3 signals verified)`,
      `Freelancer's own rate history:\n${rateLines}`,
    ].join("\n\n"),
    maxRetries: 1,
  });

  const priceBand: PriceBand | null =
    object.priceBandMin && object.priceBandMax
      ? { min: object.priceBandMin, max: object.priceBandMax, low: input.tier === "low", note: object.priceBandNote }
      : null;

  return { verdict: object.verdict, reasoning: object.reasoning, priceBand, costCents: costCents(usage) };
}
