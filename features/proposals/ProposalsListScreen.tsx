"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StateChip } from "@/components/state/StateChip";
import { OutcomeCaptureModal } from "./OutcomeCaptureModal";
import { getClientById } from "@/mock/clients";
import { formatRelative } from "@/lib/format";
import { copyAndMarkSent, markProposalOutcome, requestProposalDraft } from "@/lib/actions/proposals";
import type { ProposalRow } from "@/types/db";
import type { ProposalState } from "@/components/state/types";
import styles from "./ProposalsListScreen.module.css";

const NOW = new Date("2026-08-02T14:10:00Z");

/**
 * Illustrative rows only, never persisted or blended with real data (handoff hard requirement).
 * Auto-hides once the user has 10 real resolved (won/lost) proposals of their own.
 */
const EXAMPLE_PROPOSALS: ProposalRow[] = [
  {
    id: "example_1",
    owner_id: "example",
    client_id: null,
    title: "Shopify checkout rebuild",
    state: "won",
    in_voice: true,
    body: "Hi Priya, I've rebuilt checkout flows for three Shopify Plus stores in the last year...",
    sent_at: "2026-06-10T10:00:00Z",
    outcome_reason: "Selected on merit",
    outcome_notes: null,
    resolved_at: "2026-06-13T10:00:00Z",
    embedding: null,
    created_at: "2026-06-09T09:30:00Z",
  },
  {
    id: "example_2",
    owner_id: "example",
    client_id: null,
    title: "Dashboard CSV export + filters",
    state: "draft",
    in_voice: false,
    body: "Survey-fallback draft: not enough past-proposal history to draft in your voice yet.",
    sent_at: null,
    outcome_reason: null,
    outcome_notes: null,
    resolved_at: null,
    embedding: null,
    created_at: "2026-06-12T12:00:00Z",
  },
];

const EXAMPLE_HIDE_THRESHOLD = 10;

type FilterKey = "all" | ProposalState;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

interface ProposalsListScreenProps {
  initialProposals: ProposalRow[];
}

export function ProposalsListScreen({ initialProposals }: ProposalsListScreenProps) {
  const [proposals, setProposals] = useState<ProposalRow[]>(initialProposals);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [outcomeTarget, setOutcomeTarget] = useState<{ proposal: ProposalRow; outcome: "won" | "lost" } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftJobText, setDraftJobText] = useState("");
  const [drafting, setDrafting] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }

  const resolvedRealCount = useMemo(
    () => proposals.filter((p) => p.state === "won" || p.state === "lost").length,
    [proposals]
  );
  const showExamples = resolvedRealCount < EXAMPLE_HIDE_THRESHOLD;

  const visibleReal = useMemo(
    () => proposals.filter((p) => activeFilter === "all" || p.state === activeFilter),
    [proposals, activeFilter]
  );
  const visibleExamples = useMemo(
    () => (showExamples ? EXAMPLE_PROPOSALS.filter((p) => activeFilter === "all" || p.state === activeFilter) : []),
    [showExamples, activeFilter]
  );

  async function handleCopyAndMarkSent(p: ProposalRow) {
    navigator.clipboard?.writeText(p.body).catch(() => {});
    try {
      const updated = await copyAndMarkSent(p.id);
      setProposals((ps) => ps.map((x) => (x.id === p.id ? updated : x)));
      showToast("Copied to clipboard, marked sent.");
    } catch {
      showToast("Copied to clipboard, but could not update status.");
    }
  }

  async function confirmOutcome(reason: string, notes: string, date: string) {
    if (!outcomeTarget) return;
    const { proposal, outcome } = outcomeTarget;
    try {
      const updated = await markProposalOutcome(
        proposal.id,
        outcome,
        reason as ProposalRow["outcome_reason"],
        notes,
        date
      );
      setProposals((ps) => ps.map((x) => (x.id === proposal.id ? updated : x)));
      showToast(`Proposal marked ${outcome}: "${reason}".`);
    } catch {
      showToast("Could not update outcome. Try again.");
    }
    setOutcomeTarget(null);
  }

  async function submitDraft() {
    if (!draftJobText.trim()) return;
    setDrafting(true);
    try {
      const created = await requestProposalDraft({
        title: draftTitle.trim() || "Untitled proposal",
        jobPostText: draftJobText,
        clientId: null,
      });
      setProposals((ps) => [created, ...ps]);
      setDraftModalOpen(false);
      setDraftTitle("");
      setDraftJobText("");
      showToast(
        created.in_voice
          ? "Drafted in your voice from past proposals."
          : "Drafted from your style survey (not enough history yet for in-voice)."
      );
    } catch {
      showToast("Could not draft proposal. Try again.");
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Proposals"
        action={<Button variant="primary" onClick={() => setDraftModalOpen(true)}>New proposal</Button>}
      />

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

          {visibleReal.length === 0 && visibleExamples.length === 0 ? (
            <div className={styles.empty}>
              No proposals in this view yet. Click &ldquo;New proposal&rdquo; to draft one, or import
              past work from Settings to draft in your voice.
            </div>
          ) : (
            <>
              {visibleReal.map((p) => {
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
                        <Button
                          variant="primary"
                          style={{ height: 32, padding: "0 12px", fontSize: 13 }}
                          onClick={() => handleCopyAndMarkSent(p)}
                        >
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
              })}

              {visibleExamples.length > 0 && (
                <>
                  <div className={styles.sectionLabel}>Example data · auto-hides at 10 resolved proposals</div>
                  {visibleExamples.map((p) => (
                    <div key={p.id} className={[styles.row, styles.exampleRow].join(" ")}>
                      <div className={styles.titleCell}>
                        <span className={styles.title}>{p.title}</span>
                        <span className={styles.examplePill}>EXAMPLE DATA</span>
                      </div>
                      <span className={styles.client}>–</span>
                      <StateChip state={p.state} />
                      <span className={styles.sent}>{p.sent_at ? formatRelative(p.sent_at, NOW) : "Not sent"}</span>
                      <div className={styles.actions} />
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {draftModalOpen && (
        <>
          <div className={styles.modalOverlay} onClick={() => !drafting && setDraftModalOpen(false)} />
          <div className={styles.modalWrap}>
            <div className={styles.modal}>
              <div className={styles.modalTitle}>Draft a new proposal</div>
              <div className={styles.modalHint}>
                Paste the job post text. Draft never sends itself, review and copy manually.
              </div>
              <Input
                placeholder="Title (e.g. 'Shopify checkout rebuild')"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
              />
              <textarea
                className={styles.textarea}
                placeholder="Paste the job post text here..."
                value={draftJobText}
                onChange={(e) => setDraftJobText(e.target.value)}
              />
              <div className={styles.modalFooter}>
                <Button variant="secondary" onClick={() => setDraftModalOpen(false)} disabled={drafting}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={submitDraft} disabled={drafting || !draftJobText.trim()}>
                  {drafting ? "Drafting…" : "Draft proposal"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {outcomeTarget && (
        <OutcomeCaptureModal
          outcome={outcomeTarget.outcome}
          proposalTitle={outcomeTarget.proposal.title}
          clientName={outcomeTarget.proposal.client_id ? getClientById(outcomeTarget.proposal.client_id)?.name ?? "–" : "–"}
          onClose={() => setOutcomeTarget(null)}
          onConfirm={(reason, notes, date) => confirmOutcome(reason, notes, date)}
        />
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
