import type { Verdict } from "~components/VerdictBadge";

export interface ClientSignal {
  label: string;
  value: string;
  tone: "verified" | "ink" | "predict" | "dim" | "risk";
  sublabel?: string;
}

export interface ClientScenario {
  jobTitle: string;
  cachedLabel: string;
  verdict: Verdict;
  confidenceLabel?: string;
  signalsVerified: number;
  priceBand: { min: string; max: string; low?: boolean; note: string } | null;
  signals: ClientSignal[];
  quote?: { text: string; source: string };
  postedBudget: { value: string; note: string };
  gateText: string;
}

export const CLIENT_SCENARIOS: Record<"full" | "low" | "insufficient", ClientScenario> = {
  full: {
    jobTitle: "Senior React Engineer for checkout rebuild",
    cachedLabel: "Cached · Aug 28",
    verdict: "BID",
    signalsVerified: 3,
    priceBand: { min: "$65/hr", max: "$95/hr", note: "Blended from client history + your rate history" },
    signals: [
      { label: "Payment", value: "Verified", tone: "verified" },
      { label: "Total spent", value: "$48,200", tone: "ink" },
      { label: "Hires / jobs posted", value: "11 / 14", tone: "ink" },
      { label: "Avg rate paid", value: "$72–$88/hr", tone: "predict", sublabel: "from 6 past hires" },
      { label: "Member since", value: "Mar 2019", tone: "ink" },
    ],
    quote: {
      text: "Clear briefs, quick to respond, and paid every invoice within a day of approval. Would work with again without hesitation.",
      source: "from public job history",
    },
    postedBudget: { value: "$60–$80/hr", note: "Fixed by client, not predicted" },
    gateText: "Client has only reviewed 2 past hires, verify fit manually.",
  },
  low: {
    jobTitle: "Contract Backend Developer for internal tools",
    cachedLabel: "Cached · Aug 28",
    verdict: "MAYBE",
    confidenceLabel: "Low confidence",
    signalsVerified: 2,
    priceBand: { min: "$60/hr", max: "$80/hr", low: true, note: "From your rate history only, client data insufficient" },
    signals: [
      { label: "Payment", value: "Unverified", tone: "risk" },
      { label: "Total spent", value: "$4,200", tone: "ink" },
      { label: "Hires / jobs posted", value: "–", tone: "dim", sublabel: "(no data)" },
      { label: "Member since", value: "Jan 2024", tone: "ink", sublabel: "Recent account" },
    ],
    postedBudget: { value: "$30–$50/hr", note: "Fixed by client, not predicted" },
    gateText: "Limited client history, research manually before committing time to this proposal.",
  },
  insufficient: {
    jobTitle: "Landing Page Redesign for early-stage startup",
    cachedLabel: "Cached · Aug 28",
    verdict: "New · Unverified",
    signalsVerified: 0,
    priceBand: null,
    signals: [
      { label: "Payment", value: "Unverified", tone: "risk" },
      { label: "Total spent", value: "$0", tone: "dim", sublabel: "(no history)" },
      { label: "Hires / jobs posted", value: "– / –", tone: "dim" },
      { label: "Member since", value: "Jun 2025", tone: "ink", sublabel: "New account" },
    ],
    postedBudget: { value: "$25–$40/hr", note: "Fixed by client, not predicted" },
    gateText: "No client history to evaluate. Proceed only if the job post itself gives you enough confidence.",
  },
};
