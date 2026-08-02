import styles from "~styles/popup.module.css";
import { Button } from "~components/Button";
import { INSIGHTS_SCENARIO } from "~mock/insights";

const OUTCOME_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  won: { color: "var(--verified)", bg: "var(--verified-tint)", label: "Won" },
  lost: { color: "var(--risk)", bg: "var(--risk-tint)", label: "Lost" },
  pending: { color: "var(--signal)", bg: "var(--signal-tint)", label: "Pending" },
};

export function InsightsScreen() {
  const s = INSIGHTS_SCENARIO;
  const pct = Math.round((s.proposalsResolved / s.proposalsNeeded) * 100);

  return (
    <div
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, var(--border) 0, var(--border) 1px, transparent 1px, transparent 8px)",
        backgroundColor: "var(--panel)",
      }}
    >
      <div style={{ position: "sticky", top: 8, display: "flex", justifyContent: "flex-end", padding: "8px 16px 0" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--ink-3)",
            background: "var(--panel-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-xl)",
            padding: "4px 10px",
            whiteSpace: "nowrap",
          }}
        >
          EXAMPLE DATA
        </div>
      </div>

      <div style={{ padding: "8px 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div className={styles.card}>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
            You have fewer than 10 resolved proposals. Example data shown below, yours will appear as you send more.
          </div>
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: 12 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 32, color: "var(--ink)" }}>
            {s.winRate}%
          </div>
          <div className={styles.sectionLabel} style={{ marginBottom: 0, marginTop: 2 }}>
            Win rate
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-4)", marginTop: 8 }}>
            {s.sentCount} proposals · {s.wonCount} won · {s.lostCount} lost
          </div>
        </div>

        <div>
          <div className={styles.sectionLabel} style={{ color: "var(--verified)" }}>
            Why you won
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {s.whyWon.map((r) => (
              <div key={r.label} className={styles.signalRow}>
                <div className={styles.signalLabel}>
                  <span style={{ color: "var(--verified)" }}>●</span>
                  {r.label}
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--verified)",
                    background: "var(--verified-tint)",
                    borderRadius: "var(--r-xl)",
                    padding: "4px 8px",
                  }}
                >
                  {r.count}×
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className={styles.sectionLabel} style={{ color: "var(--risk)" }}>
            Why you lost
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {s.whyLost.map((r) => (
              <div key={r.label} className={styles.signalRow}>
                <div className={styles.signalLabel}>
                  <span style={{ color: "var(--risk)" }}>●</span>
                  {r.label}
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--risk)",
                    background: "var(--risk-tint)",
                    borderRadius: "var(--r-xl)",
                    padding: "4px 8px",
                  }}
                >
                  {r.count}×
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.sectionLabel}>Recent outcomes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {s.recentOutcomes.map((o) => {
              const os = OUTCOME_STYLE[o.outcome];
              return (
                <div key={o.label} className={styles.signalRow}>
                  <span style={{ color: "var(--ink-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {o.label}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: os.color,
                      background: os.bg,
                      borderRadius: "var(--r-xl)",
                      padding: "3px 8px",
                      flexShrink: 0,
                    }}
                  >
                    {os.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ background: "var(--signal-tint)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: 12 }}>
          <div style={{ fontSize: 13, color: "var(--ink-2)" }}>
            Send {s.proposalsNeeded - s.proposalsResolved} more proposals to unlock your real insights.
          </div>
          <div style={{ position: "relative", height: 6, borderRadius: 3, background: "var(--panel-2)", border: "1px solid var(--border)", marginTop: 10, overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, background: "var(--signal-tint)", borderRight: "1px solid var(--signal)" }} />
          </div>
          <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", marginTop: 6 }}>
            {s.proposalsResolved} / {s.proposalsNeeded} proposals resolved
          </div>
        </div>

        <Button variant="secondary" className={styles.fullWidth}>
          View full dashboard →
        </Button>
      </div>
    </div>
  );
}
