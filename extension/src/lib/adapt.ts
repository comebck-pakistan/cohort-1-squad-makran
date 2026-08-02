import type { ScrapedJobPage } from "./scrape";
import type { AnalyzeClientResponse } from "./api";
import type { ClientScenario, ClientSignal } from "~mock/client";

const GATE_TEXT: Record<string, string> = {
  full: "Signals look strong. Still worth a quick read of the full job post before committing.",
  low: "Partial client signal. Verify manually before committing time to this proposal.",
  insufficient: "No client history to evaluate. Proceed only if the job post itself gives you enough confidence.",
};

function formatSpent(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

/**
 * Maps the real analysis response (persisted, derived fields only, per the clients table
 * schema) plus the raw scrape (ephemeral, this-session-only display facts like the exact
 * dollar figure, since the schema only persists spend_visible as a bool) onto the same
 * ClientScenario shape M8's mock screens already render. No new UI, real data through the
 * existing component.
 */
export function toClientScenario(scraped: ScrapedJobPage, response: AnalyzeClientResponse): ClientScenario {
  const { client } = response;
  const tier = client.confidence_tier;

  const signals: ClientSignal[] = [
    {
      label: "Payment",
      value: client.payment_verified ? "Verified" : "Unverified",
      tone: client.payment_verified ? "verified" : "risk",
    },
    {
      label: "Total spent",
      value: scraped.signals.totalSpentUsd ? formatSpent(scraped.signals.totalSpentUsd) : "–",
      tone: client.spend_visible ? "ink" : "dim",
      sublabel: client.spend_visible ? undefined : "(no history)",
    },
    {
      label: "Hires / jobs posted",
      value: client.hires_count > 0 ? String(client.hires_count) : "–",
      tone: client.hires_count > 0 ? "ink" : "dim",
    },
    {
      label: "Member since",
      value: scraped.memberSinceLabel ?? "–",
      tone: "ink",
    },
  ];

  return {
    jobTitle: scraped.jobTitle,
    cachedLabel: response.cached ? "Cached" : "Analyzed just now",
    verdict: client.verdict ?? "New · Unverified",
    confidenceLabel: tier === "low" ? "Low confidence" : undefined,
    signalsVerified: [client.payment_verified, client.spend_visible, client.hires_count > 0].filter(Boolean).length,
    priceBand:
      client.price_band_min && client.price_band_max
        ? { min: client.price_band_min, max: client.price_band_max, low: client.price_band_low_confidence, note: response.reasoning ?? "" }
        : null,
    signals,
    postedBudget: { value: scraped.postedBudget ?? "Not specified", note: "Fixed by client, not predicted" },
    gateText: GATE_TEXT[tier],
  };
}
