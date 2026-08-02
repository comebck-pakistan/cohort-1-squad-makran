import styles from "~styles/popup.module.css";

export function SignedOutScreen() {
  return (
    <div className={styles.utilityBody}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--ink-4)" }}>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V7a4 4 0 1 1 8 0v4" />
      </svg>
      <div className={styles.utilityTitle}>Sign in to Agentic OS</div>
      <p>Connect your account to analyze clients, draft proposals, and track your win rate.</p>
      <div style={{ height: 8 }} />
      <button
        style={{
          width: 220,
          height: 40,
          borderRadius: "var(--r-md)",
          border: "1px solid transparent",
          background: "var(--signal)",
          color: "#fff",
          fontFamily: "var(--font-body)",
          fontWeight: 600,
          fontSize: 15,
          cursor: "pointer",
        }}
      >
        Sign in →
      </button>
      <div style={{ fontSize: 12, color: "var(--ink-4)" }}>
        Don&apos;t have an account? Get started at <a href="#">agenticos.com</a>
      </div>
    </div>
  );
}
