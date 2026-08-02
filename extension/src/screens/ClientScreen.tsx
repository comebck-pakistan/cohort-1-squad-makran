import styles from "~styles/popup.module.css";
import { Button } from "~components/Button";
import { VerdictBadge } from "~components/VerdictBadge";
import { PriceBand } from "~components/PriceBand";
import { HumanGateBar } from "~components/HumanGateBar";
import type { ClientScenario } from "~mock/client";

const TONE_COLOR: Record<string, string> = {
  verified: "var(--verified)",
  ink: "var(--ink)",
  predict: "var(--predict)",
  dim: "var(--ink-4)",
  risk: "var(--risk)",
};

export function ClientScreen({ scenario }: { scenario: ClientScenario }) {
  return (
    <div className={styles.body}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
          <VerdictBadge verdict={scenario.verdict} />
          {scenario.confidenceLabel && (
            <span style={{ fontSize: 11, color: "var(--predict)" }}>{scenario.confidenceLabel}</span>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 20,
                  height: 6,
                  borderRadius: 3,
                  background: i < scenario.signalsVerified ? "var(--verified)" : "var(--border)",
                }}
              />
            ))}
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>
            {scenario.signalsVerified}/3 signals verified
          </span>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.sectionLabel}>Suggested rate</div>
        {scenario.priceBand ? (
          <>
            <PriceBand min={scenario.priceBand.min} max={scenario.priceBand.max} low={scenario.priceBand.low} />
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 8 }}>{scenario.priceBand.note}</div>
          </>
        ) : (
          <>
            <div style={{ height: 6, borderRadius: 3, background: "var(--border)", border: "1px solid var(--border)" }} />
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontStyle: "italic", color: "var(--ink-4)" }}>
                Insufficient data
              </span>
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 8 }}>
              Add more proposals to unlock rate suggestions.
            </div>
          </>
        )}
      </div>

      <div>
        <div className={styles.sectionLabel}>Client signals</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {scenario.signals.map((s) => (
            <div key={s.label} className={styles.signalRow}>
              <div className={styles.signalLabel}>
                <span style={{ color: TONE_COLOR[s.tone] }}>●</span>
                {s.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span className={styles.signalValue} style={{ color: TONE_COLOR[s.tone] }}>
                  {s.value}
                </span>
                {s.sublabel && <span className={styles.signalSub}>{s.sublabel}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {scenario.quote && (
        <div className={styles.card} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ color: "var(--ink)", flexShrink: 0, marginTop: 2 }}>●</span>
          <div>
            <div
              style={{
                fontSize: 13,
                fontStyle: "italic",
                color: "var(--ink-2)",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              &ldquo;{scenario.quote.text}&rdquo;
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 6 }}>{scenario.quote.source}</div>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.sectionLabel} style={{ marginBottom: 6 }}>
          Posted budget
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--ink)" }}>
          {scenario.postedBudget.value}
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 6 }}>
          <span style={{ color: "var(--ink-4)" }}>●</span> {scenario.postedBudget.note}
        </div>
      </div>

      <HumanGateBar>
        <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>{scenario.gateText}</div>
      </HumanGateBar>

      <div className={styles.buttonsCol}>
        <Button variant="primary" className={styles.fullWidth}>
          Draft proposal →
        </Button>
        <Button variant="secondary" className={styles.fullWidth}>
          View full analysis
        </Button>
      </div>
    </div>
  );
}
