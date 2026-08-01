"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import styles from "./ImportProposalsScreen.module.css";

interface ProposalDraft {
  id: string;
  title: string;
  text: string;
  expanded: boolean;
  removable: boolean;
}

interface RateRow {
  id: string;
  category: string;
  rate: string;
  evidence?: string;
  kind: "fact" | "prediction";
  editing: boolean;
}

const INITIAL_PROPOSALS: ProposalDraft[] = [
  {
    id: "p1",
    title: "Shopify checkout rebuild: full-stack proposal",
    text: "Hi Sarah, I read through your brief for rebuilding the checkout flow on Shopify Plus. My approach would be to start with a scoped audit of the current cart logic, then rebuild the payment step as a headless component so it can be tested independently before swapping it in. I've shipped three similar Shopify Plus migrations in the last year, each landing within two weeks of estimate.",
    expanded: false,
    removable: false,
  },
  { id: "p2", title: "", text: "", expanded: true, removable: false },
];

const INITIAL_RATES: RateRow[] = [
  { id: "r1", category: "Full-stack web development", rate: "$65–85/hr", evidence: "parsed from 2 proposals", kind: "prediction", editing: false },
  { id: "r2", category: "Shopify app development", rate: "$4,500–6,500/project", evidence: "parsed from 1 proposal", kind: "prediction", editing: false },
  { id: "r3", category: "API integration", rate: "$70/hr", evidence: "parsed from 1 proposal", kind: "fact", editing: false },
];

export function ImportProposalsScreen() {
  const router = useRouter();
  const [proposals, setProposals] = useState(INITIAL_PROPOSALS);
  const [rates, setRates] = useState(INITIAL_RATES);
  const [addingManual, setAddingManual] = useState(false);
  const [manualCategory, setManualCategory] = useState("");
  const [manualRate, setManualRate] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  function updateProposal(id: string, patch: Partial<ProposalDraft>) {
    setProposals((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addProposal() {
    setProposals((ps) => [...ps, { id: `p${Date.now()}`, title: "", text: "", expanded: true, removable: true }]);
  }

  function removeProposal(id: string) {
    setProposals((ps) => ps.filter((p) => p.id !== id));
  }

  function confirmRate(id: string) {
    setRates((rs) => rs.map((r) => (r.id === id ? { ...r, kind: "fact", editing: false } : r)));
  }

  function deleteRate(id: string) {
    setRates((rs) => rs.filter((r) => r.id !== id));
  }

  function toggleRateEdit(id: string) {
    setRates((rs) => rs.map((r) => (r.id === id ? { ...r, editing: !r.editing } : r)));
  }

  function updateRate(id: string, patch: Partial<RateRow>) {
    setRates((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function submitManualRate() {
    const category = manualCategory.trim();
    const rate = manualRate.trim();
    if (!category || !rate) return;
    setRates((rs) => [...rs, { id: `r${Date.now()}`, category, rate, kind: "fact", editing: false }]);
    setAddingManual(false);
    setManualCategory("");
    setManualRate("");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--base)" }}>
      <OnboardingHeader current={0} />
      <div className={styles.page}>
        <h1 className={styles.h1}>Bring in your past work</h1>
        <p className={styles.lede}>
          Paste a few of your best past proposals. We use them to write in your real voice and to
          learn your typical rates. Nothing is sent anywhere.
        </p>

        <div className={styles.grid}>
          <div className={styles.proposalList}>
            {proposals.map((p) => (
              <Card key={p.id}>
                {p.expanded ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div className={styles.rowHead}>
                      <div style={{ flex: 1 }}>
                        <Input
                          placeholder="Job title (e.g. 'Shopify checkout rebuild')"
                          value={p.title}
                          onChange={(e) => updateProposal(p.id, { title: e.target.value })}
                        />
                      </div>
                      {p.removable && (
                        <button className={styles.removeLink} onClick={() => removeProposal(p.id)}>
                          Remove
                        </button>
                      )}
                    </div>
                    <textarea
                      className={styles.textarea}
                      placeholder="Paste your proposal text here..."
                      value={p.text}
                      onChange={(e) => updateProposal(p.id, { text: e.target.value })}
                    />
                    {p.text.trim() && (
                      <button className={styles.collapseLink} onClick={() => updateProposal(p.id, { expanded: false })}>
                        Collapse
                      </button>
                    )}
                  </div>
                ) : (
                  <div className={styles.collapsedRow}>
                    <div className={styles.collapsedHead}>
                      <span className={styles.collapsedTitle}>{p.title || "Untitled proposal"}</span>
                      <button className={styles.editLink} onClick={() => updateProposal(p.id, { expanded: true })}>
                        Edit
                      </button>
                    </div>
                    <div className={styles.collapsedText}>{p.text}</div>
                  </div>
                )}
              </Card>
            ))}

            <div>
              <Button variant="ghost" onClick={addProposal}>
                + Add another
              </Button>
            </div>

            <div className={styles.hint}>0–1 proposals? You&rsquo;ll answer a short style survey instead.</div>
          </div>

          <div>
            <Card raised eyebrow="Parsed from your proposals" title="Rates we found">
              <div className={styles.ratesHead}>
                <span>Job category</span>
                <span>Typical rate</span>
              </div>

              {rates.length === 0 && <div className={styles.ratesEmpty}>No rates found yet. Add them here.</div>}

              {rates.map((r) =>
                r.editing ? (
                  <div key={r.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--border)" }}>
                    <div className={styles.rateEditing}>
                      <Input
                        placeholder="Job category"
                        value={r.category}
                        onChange={(e) => updateRate(r.id, { category: e.target.value })}
                      />
                      <Input
                        placeholder="e.g. $60–80/hr"
                        value={r.rate}
                        onChange={(e) => updateRate(r.id, { rate: e.target.value })}
                      />
                    </div>
                    <button className={styles.rateAction} style={{ color: "var(--signal)" }} onClick={() => toggleRateEdit(r.id)}>
                      Done
                    </button>
                  </div>
                ) : (
                  <div key={r.id} className={styles.rateRow}>
                    <div className={styles.rateCategory}>
                      <span className={styles.rateCategoryLabel}>{r.category}</span>
                      <div className={styles.rateActions}>
                        <button className={[styles.rateAction, styles.rateActionEdit].join(" ")} onClick={() => toggleRateEdit(r.id)}>
                          Edit
                        </button>
                        {r.kind === "prediction" && (
                          <button className={[styles.rateAction, styles.rateActionConfirm].join(" ")} onClick={() => confirmRate(r.id)}>
                            Confirm
                          </button>
                        )}
                        <button className={[styles.rateAction, styles.rateActionRemove].join(" ")} onClick={() => deleteRate(r.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                    <div>
                      {r.kind === "prediction" ? (
                        <>
                          <div className={styles.predictionValue}>
                            <span className={styles.predictionMarker}>≈</span>
                            <div className={styles.predictionBox}>
                              <span className={styles.predictionRate}>{r.rate}</span>
                              <span className={styles.predictionEvidence}>{r.evidence}</span>
                            </div>
                          </div>
                          <div className={styles.predictionNote}>parsed, confirm or edit</div>
                        </>
                      ) : (
                        <div className={styles.factValue}>
                          <span className={styles.factMarker}>●</span>
                          <div className={styles.factBox}>
                            <span className={styles.factRate}>{r.rate}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}

              {addingManual ? (
                <div className={styles.manualForm}>
                  <div className={styles.rateEditing}>
                    <Input placeholder="Job category" value={manualCategory} onChange={(e) => setManualCategory(e.target.value)} />
                    <Input placeholder="e.g. $60–80/hr" value={manualRate} onChange={(e) => setManualRate(e.target.value)} />
                  </div>
                  <div className={styles.manualLinks}>
                    <button className={styles.manualSubmit} onClick={submitManualRate}>
                      Add rate
                    </button>
                    <button className={styles.manualCancel} onClick={() => setAddingManual(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button className={styles.manualAddRow} onClick={() => setAddingManual(true)}>
                  <span className={styles.manualAddPlus}>+</span>
                  <span style={{ fontSize: 14 }}>Add rate manually</span>
                </button>
              )}
            </Card>
          </div>
        </div>

        <div className={styles.footer}>
          <Button variant="secondary" onClick={() => showToast("Skipped. You can add proposals later from Settings.")}>
            Skip for now
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              showToast("Saved. Continuing to Voice…");
              router.push("/onboarding/voice");
            }}
          >
            Save &amp; continue
          </Button>
        </div>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
