"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { StateChip } from "@/components/state/StateChip";
import { OutcomeCaptureModal } from "./OutcomeCaptureModal";
import { mockProposals as initialProposals } from "@/mock/proposals";
import { getClientById } from "@/mock/clients";
import { formatRelative } from "@/lib/format";
import type { ProposalRow } from "@/types/db";
import type { ProposalState } from "@/components/state/types";
import styles from "./ProposalsListScreen.module.css";

const NOW = new Date("2026-08-02T14:10:00Z");

type FilterKey = "all" | ProposalState;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export function ProposalsListScreen() {
  const [proposals, setProposals] = useState<ProposalRow[]>(initialProposals);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [outcomeTarget, setOutcomeTarget] = useState<{ proposal: ProposalRow; outcome: "won" | "lost" } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  const visible = useMemo(
    () => proposals.filter((p) => activeFilter === "all" || p.state === activeFilter),
    [proposals, activeFilter]
  );

  function copyAndMarkSent(p: ProposalRow) {
    navigator.clipboard?.writeText(p.body).catch(() => {});
    setProposals((ps) => ps.map((x) => (x.id === p.id ? { ...x, state: "sent", sent_at: new Date().toISOString() } : x)));
    showToast("Copied to clipboard, marked sent.");
  }

  function confirmOutcome(reason: string) {
    if (!outcomeTarget) return;
    const { proposal, outcome } = outcomeTarget;
    setProposals((ps) =>
      ps.map((x) => (x.id === proposal.id ? { ...x, state: outcome, outcome_reason: reason as ProposalRow["outcome_reason"] } : x))
    );
    showToast(`Proposal marked ${outcome}: "${reason}".`);
    setOutcomeTarget(null);
  }

  return (
    <div>
      <PageHeader title="Proposals" />

      <div className={styles.toolbar}>
        <div className={styles.filterRow}>
          {FILTERS.map((f) => (
            <div
              key={f.key}
              className={[styles.pill, activeFilter === f.key && styles.pillActive].filter(Boolean).join(" ")}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.table}>
          <div className={styles.headRow}>
            <span>Proposal</span>
            <span>Client</span>
            <span>Status</span>
            <span>Sent</span>
            <span />
          </div>

          {visible.length === 0 ? (
            <div className={styles.empty}>
              No proposals in this view yet. Import past work from Settings to start drafting in
              your voice.
            </div>
          ) : (
            visible.map((p) => {
              const client = p.client_id ? getClientById(p.client_id) : undefined;
              return (
                <div key={p.id} className={styles.row}>
                  <div className={styles.titleCell}>
                    <span className={styles.title}>{p.title}</span>
                    {!p.in_voice && <span className={styles.fallbackTag}>Survey-fallback draft</span>}
                  </div>
                  <span className={styles.client}>{client?.name ?? "–"}</span>
                  <StateChip state={p.state} />
                  <span className={styles.sent}>{p.sent_at ? formatRelative(p.sent_at, NOW) : "Not sent"}</span>
                  <div className={styles.actions}>
                    {p.state === "draft" && (
                      <Button variant="primary" style={{ height: 32, padding: "0 12px", fontSize: 13 }} onClick={() => copyAndMarkSent(p)}>
                        Copy &amp; mark sent
                      </Button>
                    )}
                    {p.state === "sent" && (
                      <>
                        <Button
                          variant="secondary"
                          style={{ height: 32, padding: "0 12px", fontSize: 13 }}
                          onClick={() => setOutcomeTarget({ proposal: p, outcome: "lost" })}
                        >
                          Mark lost
                        </Button>
                        <Button
                          variant="primary"
                          style={{ height: 32, padding: "0 12px", fontSize: 13 }}
                          onClick={() => setOutcomeTarget({ proposal: p, outcome: "won" })}
                        >
                          Mark won
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {outcomeTarget && (
        <OutcomeCaptureModal
          outcome={outcomeTarget.outcome}
          proposalTitle={outcomeTarget.proposal.title}
          clientName={outcomeTarget.proposal.client_id ? getClientById(outcomeTarget.proposal.client_id)?.name ?? "–" : "–"}
          onClose={() => setOutcomeTarget(null)}
          onConfirm={(reason) => confirmOutcome(reason)}
        />
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
