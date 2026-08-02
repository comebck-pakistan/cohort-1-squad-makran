import styles from "~styles/popup.module.css";

export function LoadingScreen() {
  return (
    <div className={styles.utilityBody}>
      <div className={styles.spinner} />
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-2)" }}>Analyzing client…</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: 4 }}>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLine} />
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 4 }}>This usually takes under 10 seconds.</div>
    </div>
  );
}
