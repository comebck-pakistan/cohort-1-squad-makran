import type { ProposalRow } from "@/types/db";

const DAY_MS = 86400000;

export interface ReasonBreakdownRow {
  label: string;
  count: number;
  pct: number;
}

export interface WinRateTrendPoint {
  label: string;
  winRate: number;
}

export interface InsightsStats {
  sentCount: number;
  resolvedCount: number;
  wonCount: number;
  pendingCount: number;
  winRate: number | null;
  avgTimeToCloseDays: number | null;
  wonReasons: ReasonBreakdownRow[];
  lostReasons: ReasonBreakdownRow[];
  recentOutcomes: ProposalRow[];
  winRateTrend: WinRateTrendPoint[];
}

function reasonBreakdown(rows: ProposalRow[]): ReasonBreakdownRow[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.outcome_reason) continue;
    counts.set(r.outcome_reason, (counts.get(r.outcome_reason) ?? 0) + 1);
  }
  const total = rows.length;
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count);
}

/** Pure aggregation over the caller's own proposals, no LLM involved. Returns null for any stat without enough data, never fabricates. */
export function computeInsights(proposals: ProposalRow[], now: Date = new Date()): InsightsStats {
  const ninetyDaysAgo = now.getTime() - 90 * DAY_MS;
  const sent = proposals.filter((p) => p.state !== "draft" && p.sent_at && new Date(p.sent_at).getTime() >= ninetyDaysAgo);
  const resolved = proposals.filter((p) => p.state === "won" || p.state === "lost");
  const won = proposals.filter((p) => p.state === "won");
  const lost = proposals.filter((p) => p.state === "lost");
  const pending = proposals.filter((p) => p.state === "sent");

  const winRate = resolved.length > 0 ? Math.round((won.length / resolved.length) * 100) : null;

  const closeTimes = resolved
    .filter((p) => p.sent_at && p.resolved_at)
    .map((p) => (new Date(p.resolved_at as string).getTime() - new Date(p.sent_at as string).getTime()) / DAY_MS);
  const avgTimeToCloseDays =
    closeTimes.length > 0 ? Math.round((closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length) * 10) / 10 : null;

  const recentOutcomes = [...resolved].sort(
    (a, b) => new Date(b.resolved_at ?? b.created_at).getTime() - new Date(a.resolved_at ?? a.created_at).getTime()
  );

  const monthly = new Map<string, { won: number; resolved: number }>();
  for (const p of resolved) {
    if (!p.resolved_at) continue;
    const d = new Date(p.resolved_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = monthly.get(key) ?? { won: 0, resolved: 0 };
    bucket.resolved += 1;
    if (p.state === "won") bucket.won += 1;
    monthly.set(key, bucket);
  }
  const winRateTrend = Array.from(monthly.entries())
    .map(([key, { won: w, resolved: r }]) => {
      const [year, month] = key.split("-").map(Number);
      return {
        key,
        label: new Date(year, month, 1).toLocaleString("en-US", { month: "short" }),
        winRate: Math.round((w / r) * 100),
      };
    })
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map(({ label, winRate: wr }) => ({ label, winRate: wr }));

  return {
    sentCount: sent.length,
    resolvedCount: resolved.length,
    wonCount: won.length,
    pendingCount: pending.length,
    winRate,
    avgTimeToCloseDays,
    wonReasons: reasonBreakdown(won),
    lostReasons: reasonBreakdown(lost),
    recentOutcomes,
    winRateTrend,
  };
}
