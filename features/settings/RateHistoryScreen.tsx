"use client";

import { useState } from "react";
import { saveRateHistory } from "@/lib/actions/rates";
import type { RateEntry } from "@/lib/rates";
import styles from "./RateHistoryScreen.module.css";

interface RateHistoryScreenProps {
  initialRates: RateEntry[];
}

export function RateHistoryScreen({ initialRates }: RateHistoryScreenProps) {
  const [rates, setRates] = useState<RateEntry[]>(initialRates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newRate, setNewRate] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  async function persist(next: RateEntry[], previous: RateEntry[]) {
    setRates(next);
    try {
      await saveRateHistory(next);
    } catch {
      setRates(previous);
      showToast("Could not save. Try again.");
    }
  }

  function updateRate(id: string, rate: string) {
    setRates((rs) => rs.map((r) => (r.id === id ? { ...r, rate } : r)));
  }

  function confirmRow(id: string) {
    const next = rates.map((r) => (r.id === id ? { ...r, kind: "fact" as const } : r));
    persist(next, rates);
    showToast("Rate confirmed.");
  }

  function removeRow(id: string) {
    persist(
      rates.filter((r) => r.id !== id),
      rates
    );
  }

  function saveEdit() {
    persist(rates, rates);
    setEditingId(null);
  }

  function saveNewRow() {
    const category = newCategory.trim();
    const rate = newRate.trim();
    if (!category || !rate) return;
    const next = [...rates, { id: `a${Date.now()}`, category, source: "Added manually", rate, kind: "fact" as const }];
    persist(next, rates);
    setAddingNew(false);
    setNewCategory("");
    setNewRate("");
  }

  return (
    <div className={styles.body}>
      <div className={styles.sectionTitle}>Rate history</div>
      <div className={styles.lede}>
        Your typical rates by job category. Used to calculate price bands when client data is
        limited.
      </div>

      <div className={styles.table}>
        <div className={styles.headRow}>
          <span>Job category</span>
          <span>Source</span>
          <span>Typical rate</span>
          <span>Status</span>
          <span />
        </div>

        {rates.length === 0 && !addingNew && (
          <div style={{ padding: "32px 18px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            No rates yet. Add one below, or import past proposals from onboarding to parse them
            automatically.
          </div>
        )}

        {rates.map((r) =>
          editingId === r.id ? (
            <div key={r.id} className={styles.row}>
              <span className={styles.category}>{r.category}</span>
              <span className={styles.source}>{r.source}</span>
              <input
                className={styles.editInput}
                value={r.rate}
                onChange={(e) => updateRate(r.id, e.target.value)}
              />
              <span />
              <div className={styles.editLinks}>
                <button className={styles.editLink} style={{ color: "var(--signal)" }} onClick={saveEdit}>
                  Save
                </button>
                <button className={styles.editLink} style={{ color: "var(--ink-3)" }} onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={r.id} className={styles.row}>
              <span className={styles.category}>{r.category}</span>
              <span className={styles.source}>{r.source}</span>
              {r.kind === "fact" ? (
                <div className={styles.rateFact}>
                  <span className={styles.rateFactDot}>●</span>
                  <span className={styles.rateFactValue}>{r.rate}</span>
                </div>
              ) : (
                <div className={styles.ratePrediction}>
                  <span className={styles.ratePredictionMarker}>≈</span>
                  <span className={styles.ratePredictionValue}>{r.rate}</span>
                </div>
              )}
              <span className={[styles.statusPill, r.kind === "fact" ? styles.statusConfirmed : styles.statusUnconfirmed].join(" ")}>
                {r.kind === "fact" ? "Confirmed" : "Unconfirmed"}
              </span>
              <div className={styles.actions}>
                {r.kind === "prediction" && (
                  <button className={[styles.action, styles.actionVerified].join(" ")} onClick={() => confirmRow(r.id)}>
                    Confirm
                  </button>
                )}
                <button className={[styles.action, styles.actionMuted].join(" ")} onClick={() => setEditingId(r.id)}>
                  Edit
                </button>
                <button className={[styles.action, styles.actionRisk].join(" ")} onClick={() => removeRow(r.id)}>
                  Remove
                </button>
              </div>
            </div>
          )
        )}

        {addingNew ? (
          <div className={styles.row}>
            <input
              className={styles.editInput}
              placeholder="Job category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <span />
            <input
              className={styles.editInput}
              placeholder="e.g. $60–80/hr"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
            />
            <span />
            <div className={styles.editLinks}>
              <button className={styles.editLink} style={{ color: "var(--signal)" }} onClick={saveNewRow}>
                Save
              </button>
              <button className={styles.editLink} style={{ color: "var(--ink-3)" }} onClick={() => setAddingNew(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className={styles.addRow} onClick={() => setAddingNew(true)}>
            + Add a job category and rate
          </button>
        )}
      </div>

      <div className={styles.footNote}>
        Confirmed rates are used at full weight. Unconfirmed rates are used but flagged as
        estimates in price bands.
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "var(--r-md)",
            fontSize: 14,
            boxShadow: "var(--shadow-pop)",
            zIndex: 20,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
