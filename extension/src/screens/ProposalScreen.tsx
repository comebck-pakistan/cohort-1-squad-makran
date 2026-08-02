import styles from "~styles/popup.module.css";
import { Button } from "~components/Button";
import { HumanGateBar } from "~components/HumanGateBar";
import type { ProposalScenario } from "~mock/proposal";

export function ProposalScreen({ scenario, dashed }: { scenario: ProposalScenario; dashed: boolean }) {
  return (
    <div className={styles.body}>
      <div className={dashed ? styles.cardDashed : undefined} style={dashed ? {} : { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {dashed ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "var(--predict)", fontSize: 13 }}>≈</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--predict)" }}>{scenario.badgeText}</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 6 }}>{scenario.badgeSub}</div>
          </>
        ) : (
          <>
            <span style={{ color: "var(--verified)", fontSize: 13 }}>●</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--verified)" }}>{scenario.badgeText}</span>
            <span style={{ fontSize: 12, color: "var(--ink-3)" }}>· {scenario.badgeSub}</span>
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "var(--ink-3)", flexShrink: 0 }}>
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{scenario.referenceNote}</span>
      </div>

      <div style={{ background: "var(--panel)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-xl)", padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 6 }}>
          <button style={{ background: "none", border: "none", fontFamily: "var(--font-body)", fontSize: 12, color: "var(--ink-3)", cursor: "pointer", padding: "4px 8px" }}>
            Edit
          </button>
        </div>
        <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.6 }}>
          {scenario.paragraphs.map((p, i) => (
            <p key={i} style={{ margin: i === scenario.paragraphs.length - 1 ? 0 : "0 0 10px" }}>
              {p}
            </p>
          ))}
        </div>
        <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", marginTop: 8 }}>
          {scenario.charCount} chars
        </div>
      </div>

      <div style={{ background: "var(--signal-tint)", border: "1px solid var(--border)", borderRadius: "var(--r-xl)", padding: "8px 10px", display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span style={{ color: "var(--predict)", flexShrink: 0 }}>≈</span>
        <div>
          <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{scenario.rateNote}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
            {scenario.rateSource}
          </div>
        </div>
      </div>

      <HumanGateBar>
        <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4 }}>{scenario.gateText}</div>
      </HumanGateBar>

      <div className={styles.buttonsCol} style={{ gap: 4 }}>
        <Button variant="primary" className={styles.fullWidth}>
          Copy &amp; mark sent
        </Button>
        <div className={styles.buttonSub}>{scenario.primaryButtonSub}</div>
      </div>

      <div className={styles.buttonsRow}>
        <Button variant="ghost" style={{ flex: 1 }}>
          {scenario.secondaryLabels[0]}
        </Button>
        <Button variant="ghost" style={{ flex: 1 }}>
          {scenario.secondaryLabels[1]}
        </Button>
      </div>
    </div>
  );
}
