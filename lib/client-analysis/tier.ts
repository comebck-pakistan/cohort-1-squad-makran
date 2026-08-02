import type { ConfidenceTier } from "@/types/db";

/**
 * Raw signals as scraped from a real Upwork job page. `null` means the field genuinely
 * wasn't present on the page (never coerced to a false-y default), so the tier calc below
 * can tell "unverified" apart from "unknown."
 */
export interface ScrapedClientSignals {
  paymentVerified: boolean | null;
  totalSpentUsd: number | null;
  hiresCount: number | null;
  reviewsVisible: boolean;
}

export interface TierResult {
  tier: ConfidenceTier;
  signalsVerified: number;
}

/**
 * Deterministic on purpose (docs/agentic-os-build-plan.md M9): the tier is derived from facts
 * scraped off the page, not a judgment call, so it must not be left to the LLM to self-report.
 * full requires all three hard signals; insufficient is the true absence of all of them; low
 * is everything in between.
 */
export function computeConfidenceTier(signals: ScrapedClientSignals): TierResult {
  const paymentOk = signals.paymentVerified === true;
  const spendOk = (signals.totalSpentUsd ?? 0) > 0;
  const hiresOk = (signals.hiresCount ?? 0) >= 1;

  const signalsVerified = [paymentOk, spendOk, hiresOk].filter(Boolean).length;

  if (paymentOk && spendOk && hiresOk) {
    return { tier: "full", signalsVerified };
  }
  if (signalsVerified === 0) {
    return { tier: "insufficient", signalsVerified };
  }
  return { tier: "low", signalsVerified };
}
