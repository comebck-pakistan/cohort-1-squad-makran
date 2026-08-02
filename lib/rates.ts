export interface RateEntry {
  id: string;
  category: string;
  source: string;
  rate: string;
  kind: "fact" | "prediction";
}

/**
 * Stored on auth.users.user_metadata.rate_history, same per-user-singleton pattern as M3's
 * voice profile and M7's notification_prefs: no new table for a feature that's just a small
 * user-owned list. Real column names were never locked (mock/rates.ts flagged this as
 * unreconciled since M1), this is that reconciliation, needed now as a real input to M9's
 * price-band blend.
 */
export function parseRateHistory(metadata: Record<string, unknown> | null | undefined): RateEntry[] {
  const raw = metadata?.rate_history;
  return Array.isArray(raw) ? (raw as RateEntry[]) : [];
}
