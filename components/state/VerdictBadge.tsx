import styles from "./VerdictBadge.module.css";

export type Verdict = "BID" | "NO-BID" | "MAYBE" | "New · Unverified";

const VERDICTS: Record<Verdict, { bg: string; color: string; outline?: string }> = {
  BID: { bg: "var(--verified)", color: "#fff" },
  "NO-BID": { bg: "var(--risk)", color: "#fff" },
  MAYBE: { bg: "var(--predict-tint)", color: "var(--predict)", outline: "var(--predict)" },
  "New · Unverified": { bg: "var(--panel-2)", color: "var(--ink-3)", outline: "var(--ink-4)" },
};

interface VerdictBadgeProps {
  verdict: Verdict;
}

export function VerdictBadge({ verdict }: VerdictBadgeProps) {
  const v = VERDICTS[verdict];
  return (
    <span
      className={styles.badge}
      style={{
        background: v.bg,
        color: v.color,
        border: v.outline ? `1px solid ${v.outline}` : "none",
      }}
    >
      {verdict}
    </span>
  );
}
