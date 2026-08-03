import styles from "./OnboardingHeader.module.css";

const STEPS = ["Import work", "Voice", "Connect"] as const;

interface OnboardingHeaderProps {
  /** 0-indexed current step. */
  current: 0 | 1 | 2;
}

export function OnboardingHeader({ current }: OnboardingHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.brand}>Solvo</div>
      <div className={styles.steps}>
        {STEPS.map((label, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && (
              <div
                className={[
                  styles.connector,
                  i <= current ? styles.connectorDone : styles.connectorPending,
                ].join(" ")}
              />
            )}
            <div className={styles.step}>
              <div
                className={[
                  styles.badge,
                  i < current ? styles.badgeDone : i === current ? styles.badgeActive : styles.badgePending,
                ].join(" ")}
              >
                {i < current ? "✓" : i + 1}
              </div>
              <span className={[styles.label, i === current ? styles.labelActive : styles.labelInactive].join(" ")}>
                {label}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.spacer} />
    </div>
  );
}
