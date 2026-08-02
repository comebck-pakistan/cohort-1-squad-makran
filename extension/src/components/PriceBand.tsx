import { ReactNode } from "react";
import styles from "./PriceBand.module.css";

interface PriceBandProps {
  min: ReactNode;
  max: ReactNode;
  /** Low-confidence tier: user-rate-only fallback, rendered in --predict instead of --signal. */
  low?: boolean;
  note?: ReactNode;
}

export function PriceBand({ min, max, low, note }: PriceBandProps) {
  const pct = low ? 35 : 70;
  return (
    <div className={styles.wrap}>
      <div className={styles.track}>
        <div
          className={[styles.fill, low ? styles.fillLow : styles.fillSignal].join(" ")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className={styles.endpoints}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {note && <div className={styles.note}>{note}</div>}
    </div>
  );
}
