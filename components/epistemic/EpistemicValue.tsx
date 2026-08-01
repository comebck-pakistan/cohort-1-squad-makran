import { ReactNode } from "react";
import styles from "./EpistemicValue.module.css";

type EpistemicValueProps =
  | { kind: "fact"; value: ReactNode; caption?: ReactNode }
  | { kind: "prediction"; value: ReactNode; evidence?: ReactNode }
  | { kind: "synthetic"; value: ReactNode };

/**
 * The product's one true visual signature (design-system.md §4). Every value on
 * screen must render through this component (never a bare number), so a fact
 * is never confused with a prediction or example data.
 */
export function EpistemicValue(props: EpistemicValueProps) {
  if (props.kind === "fact") {
    return (
      <div className={styles.fact}>
        <span className={styles.factDot}>●</span>
        <span className={styles.factValue}>{props.value}</span>
        {props.caption && <span className={styles.factCaption}>· {props.caption}</span>}
      </div>
    );
  }

  if (props.kind === "prediction") {
    if (!props.evidence) {
      return (
        <div className={styles.predictionEmpty}>Not enough history yet: no estimate shown.</div>
      );
    }
    return (
      <div className={styles.prediction}>
        <div className={styles.predictionHead}>
          <span className={styles.predictionMarker}>≈</span>
          <span className={styles.predictionValue}>{props.value}</span>
        </div>
        <div className={styles.predictionEvidence}>{props.evidence}</div>
      </div>
    );
  }

  return (
    <div className={styles.synthetic}>
      <div className={styles.syntheticPill}>EXAMPLE DATA</div>
      <div className={styles.syntheticValue}>{props.value}</div>
    </div>
  );
}
