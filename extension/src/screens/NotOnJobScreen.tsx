import styles from "~styles/popup.module.css";

export function NotOnJobScreen() {
  return (
    <div className={styles.utilityBody}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--ink-4)" }}>
        <circle cx="12" cy="12" r="9" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
      <div className={styles.utilityTitle}>Navigate to a job post</div>
      <p>Open any Upwork job listing to analyze the client, draft a proposal, and see relevant insights.</p>
      <div style={{ height: 4 }} />
      <button
        style={{
          width: 220,
          height: 40,
          borderRadius: "var(--r-md)",
          border: "1px solid var(--border-strong)",
          background: "var(--panel)",
          color: "var(--ink-2)",
          fontFamily: "var(--font-body)",
          fontWeight: 500,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Browse Upwork jobs →
      </button>
      <div style={{ fontSize: 12, color: "var(--ink-4)" }}>
        Or open Agentic OS <a href="#">dashboard</a>
      </div>
    </div>
  );
}
