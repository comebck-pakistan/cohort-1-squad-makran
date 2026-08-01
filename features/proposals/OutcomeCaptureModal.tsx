"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { OutcomeReasonLost, OutcomeReasonWon } from "@/types/db";
import styles from "./OutcomeCaptureModal.module.css";

const WON_REASONS: OutcomeReasonWon[] = ["Selected on merit", "Referred / relationship", "Price matched budget"];
const LOST_REASONS: OutcomeReasonLost[] = [
  "Price too high",
  "Went with someone else",
  "No response",
  "Scope mismatch",
  "Other",
];

interface OutcomeCaptureModalProps {
  outcome: "won" | "lost";
  proposalTitle: string;
  clientName: string;
  onClose: () => void;
  onConfirm: (reason: string, notes: string, date: string) => void;
}

export function OutcomeCaptureModal({ outcome, proposalTitle, clientName, onClose, onConfirm }: OutcomeCaptureModalProps) {
  const isWon = outcome === "won";
  const reasons = isWon ? WON_REASONS : LOST_REASONS;
  const [reason, setReason] = useState<string>(reasons[0]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("Mon, Aug 3, 2026");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.wrap}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <div>
              <div className={[styles.title, isWon ? styles.titleWon : styles.titleLost].join(" ")}>
                Mark as {outcome}
              </div>
              <div className={styles.subtitle}>
                {proposalTitle} · {clientName}
              </div>
            </div>
            <button className={styles.close} onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>
              Why did this close? <span className={styles.required}>(required)</span>
            </div>
            <div className={styles.dropdownWrap}>
              <button className={styles.dropdownTrigger} onClick={() => setDropdownOpen((v) => !v)}>
                <span className={styles.dropdownValue}>{reason}</span>
                <span className={styles.dropdownCaret}>▾</span>
              </button>
              {dropdownOpen && (
                <div className={styles.dropdownMenu}>
                  {reasons.map((r) => (
                    <button
                      key={r}
                      className={styles.dropdownOption}
                      onClick={() => {
                        setReason(r);
                        setDropdownOpen(false);
                      }}
                    >
                      <span>{r}</span>
                      {r === reason && <span className={isWon ? styles.checkWon : styles.checkLost}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>
              Any notes? <span className={styles.optional}>(optional)</span>
            </div>
            <textarea
              className={styles.textarea}
              placeholder={
                isWon
                  ? "e.g. Client mentioned our Shopify experience was the deciding factor"
                  : "e.g. They went with a larger agency that could handle the full rebrand"
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <div className={styles.fieldHint}>For your reference only, not used in dashboard aggregation.</div>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>When</div>
            <input className={styles.plainInput} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className={styles.footer}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <button
              className={[styles.confirmBtn, isWon ? styles.confirmBtnWon : styles.confirmBtnLost].join(" ")}
              onClick={() => onConfirm(reason, notes, date)}
            >
              Confirm: mark {outcome}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
