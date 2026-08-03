import { useState } from "react";
import styles from "~styles/popup.module.css";

interface SignedOutScreenProps {
  /** When provided, renders a real token-paste form instead of the decorative sign-in button. */
  onSubmitToken?: (token: string) => Promise<void>;
}

export function SignedOutScreen({ onSubmitToken }: SignedOutScreenProps) {
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!onSubmitToken || !token.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmitToken(token.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify that token.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.utilityBody}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--ink-4)" }}>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V7a4 4 0 1 1 8 0v4" />
      </svg>
      <div className={styles.utilityTitle}>Sign in to Solvo</div>
      <p>Connect your account to analyze clients, draft proposals, and track your win rate.</p>
      <div style={{ height: 8 }} />
      {onSubmitToken ? (
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your extension token"
            style={{
              width: "100%",
              height: 36,
              borderRadius: "var(--r-md)",
              border: "1px solid var(--border-strong)",
              padding: "0 10px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !token.trim()}
            style={{
              width: "100%",
              height: 40,
              borderRadius: "var(--r-md)",
              border: "1px solid transparent",
              background: "var(--signal)",
              color: "#fff",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 15,
              cursor: submitting ? "default" : "pointer",
              opacity: submitting || !token.trim() ? 0.6 : 1,
            }}
          >
            {submitting ? "Verifying…" : "Sign in →"}
          </button>
          {error && <div style={{ fontSize: 12, color: "var(--risk)" }}>{error}</div>}
          <div style={{ fontSize: 12, color: "var(--ink-4)" }}>
            Get your token from Solvo &rarr; Settings &rarr; Integrations &rarr; Browser extension.
          </div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
