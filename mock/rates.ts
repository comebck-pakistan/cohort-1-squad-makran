/**
 * Rate history isn't one of the 8 tables named in docs/agentic-os-handoff.md §5:
 * it's referenced only as an input to the price-band calc. Shaped here as a local
 * mock, not added to types/db.ts, since its real column names aren't locked yet;
 * flag to reconcile once M3 schema work covers it.
 */
export interface RateEntry {
  id: string;
  category: string;
  source: string;
  rate: string;
  kind: "fact" | "prediction";
}

export const mockRates: RateEntry[] = [
  { id: "a1", category: "Full-stack web development", source: "Parsed from 3 proposals", rate: "$75–90/hr", kind: "fact" },
  { id: "a2", category: "Shopify app development", source: "Parsed from 2 proposals", rate: "$5,000–7,000/project", kind: "fact" },
  { id: "a3", category: "API integration", source: "Added manually", rate: "$70/hr", kind: "fact" },
  { id: "a4", category: "React Native development", source: "Parsed from 1 proposal", rate: "$80–95/hr", kind: "prediction" },
  { id: "a5", category: "DevOps / CI setup", source: "Parsed from 1 proposal", rate: "$60/hr", kind: "prediction" },
];
