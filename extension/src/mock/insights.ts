export interface ReasonRow {
  label: string;
  count: number;
}

export interface OutcomeRow {
  label: string;
  outcome: "won" | "lost" | "pending";
}

export const INSIGHTS_SCENARIO = {
  jobTitle: "Senior React Engineer for checkout rebuild",
  cachedLabel: "Cached · Aug 28",
  winRate: 34,
  sentCount: 12,
  wonCount: 4,
  lostCount: 8,
  whyWon: [
    { label: "Relevant past project mentioned", count: 3 },
    { label: "Responded within an hour", count: 3 },
    { label: "Rate matched client's budget", count: 2 },
  ] as ReasonRow[],
  whyLost: [
    { label: "Rate above client's avg paid", count: 5 },
    { label: "Generic proposal opener", count: 3 },
    { label: "Slow response time", count: 2 },
  ] as ReasonRow[],
  recentOutcomes: [
    { label: "Landing page redesign", outcome: "won" },
    { label: "Checkout flow rebuild", outcome: "lost" },
    { label: "API integration for CRM", outcome: "pending" },
    { label: "Mobile app UI polish", outcome: "won" },
  ] as OutcomeRow[],
  proposalsResolved: 4,
  proposalsNeeded: 10,
};
