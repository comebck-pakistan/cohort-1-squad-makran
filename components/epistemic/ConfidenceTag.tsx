import { ReactNode } from "react";
import styles from "./ConfidenceTag.module.css";

export type ConfidenceTier = "full" | "low" | "insufficient";

const TIERS: Record<ConfidenceTier, { segs: number; color: string; label: string }> = {
  full: { segs: 3, color: "var(--verified)", label: "Full analysis" },
  low: { segs: 1.5, color: "var(--predict)", label: "Low confidence" },
  insufficient: { segs: 0, color: "var(--border)", label: "Insufficient data" },
};

const HEIGHTS = [6, 10, 14];

interface ConfidenceTagProps {
  tier: ConfidenceTier;
  missingNote?: ReactNode;
}

export function ConfidenceTag({ tier, missingNote }: ConfidenceTagProps) {
  const t = TIERS[tier];
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className={styles.bars}>
          {HEIGHTS.map((h, i) => (
            <span
              key={i}
              className={styles.bar}
              style={{ height: h, background: i < t.segs ? t.color : "var(--border)" }}
            />
          ))}
        </div>
        <span className={styles.label}>{t.label}</span>
      </div>
      {missingNote && <div className={styles.missingNote}>{missingNote}</div>}
    </div>
  );
}
