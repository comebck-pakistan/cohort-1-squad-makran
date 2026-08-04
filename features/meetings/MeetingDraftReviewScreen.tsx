"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Trash2 } from "lucide-react";
import { promoteDraftTickets, discardDraftTickets } from "@/lib/actions/meetings";
import type { MeetingRow, RepoRow, ClientRow } from "@/types/db";
import styles from "./MeetingDraftReviewScreen.module.css";

interface DraftTicketDraft {
  id: string;
  title: string;
  body: string;
  repoId: string | null;
}

interface MeetingDraftReviewScreenProps {
  meeting: MeetingRow | null;
  repos: RepoRow[];
  clients: ClientRow[];
}

export function MeetingDraftReviewScreen({ meeting, repos, clients }: MeetingDraftReviewScreenProps) {
  const router = useRouter();
  const client = meeting?.client_id ? clients.find((c) => c.id === meeting.client_id) : undefined;
  const defaultRepo = repos.find((r) => r.is_default);

  const [tickets, setTickets] = useState<DraftTicketDraft[]>(
    (meeting?.draft_tickets ?? []).map((t, i) => ({
      id: `draft_${i}`,
      title: t.title,
      body: t.description,
      repoId: defaultRepo?.id ?? null,
    }))
  );
  const [expandedId, setExpandedId] = useState<string | null>(tickets[0]?.id ?? null);
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  function updateTicket(id: string, patch: Partial<DraftTicketDraft>) {
    setTickets((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function deleteTicket(id: string) {
    setTickets((ts) => ts.filter((t) => t.id !== id));
  }

  if (!meeting) {
    return (
      <div style={{ padding: "40px" }}>
        <p style={{ color: "var(--ink-3)" }}>Meeting not found.</p>
      </div>
    );
  }

  if (meeting.draft_tickets.length === 0) {
    return (
      <div>
        <PageHeader title={`Draft review: ${meeting.title}`} />
        <div style={{ padding: "0 40px 40px", color: "var(--ink-3)", fontSize: 14 }}>
          No draft tickets for this meeting yet. It may still be processing, or the transcript
          didn&rsquo;t produce any actionable items.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <PageHeader title={`Draft review: ${meeting.title}${client ? `, ${client.name}` : ""}`} />

      <div className={styles.banner}>
        <div className={styles.bannerInner}>
          <div className={styles.bannerBar} />
          <span className={styles.bannerText}>
            ● Action needed · Review draft tickets: confirm or edit before tickets are created.
          </span>
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.grid}>
          <div>
            <div className={styles.colTitle}>Draft tickets</div>
            <div className={styles.colSub}>
              {tickets.length} drafts · biased toward smaller, atomic tickets, merge freely
            </div>

            <div className={styles.ticketList}>
              {tickets.map((t, i) => {
                const expanded = t.id === expandedId;
                const repoLabel = repos.find((r) => r.id === t.repoId)?.full_name ?? "–";
                return (
                  <div key={t.id} className={styles.ticketCard}>
                    <div className={styles.grip}>
                      {Array.from({ length: 6 }).map((_, gi) => (
                        <span key={gi} className={styles.gripDot} />
                      ))}
                    </div>
                    <div className={styles.ticketBody}>
                      {expanded ? (
                        <>
                          <div className={styles.draftEyebrow}>
                            Draft ticket {i + 1} of {tickets.length}
                          </div>
                          <input
                            className={styles.titleInput}
                            value={t.title}
                            onChange={(e) => updateTicket(t.id, { title: e.target.value })}
                          />
                          <textarea
                            className={styles.bodyTextarea}
                            value={t.body}
                            onChange={(e) => updateTicket(t.id, { body: e.target.value })}
                          />
                          <div className={styles.metaRow}>
                            <span className={styles.repoLabel}>repo</span>
                            <span className={styles.repoValue}>{repoLabel}</span>
                            <div style={{ flex: 1 }} />
                            <button className={styles.iconBtn} onClick={() => deleteTicket(t.id)}>
                              <Trash2 width={16} height={16} strokeWidth={1.6} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className={styles.collapsedRow}>
                          <span className={styles.collapsedTitle}>{t.title}</span>
                          <div className={styles.collapsedActions}>
                            <button className={styles.editLink} onClick={() => setExpandedId(t.id)}>
                              Edit
                            </button>
                            <button className={styles.iconBtn} onClick={() => deleteTicket(t.id)}>
                              <Trash2 width={16} height={16} strokeWidth={1.6} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className={styles.colTitle}>Transcript</div>
            <div className={styles.transcriptMeta}>
              {meeting.title} · {meeting.source === "bot_skribby" ? "Skribby bot" : "Manual paste"} · {meeting.transcript_source ?? "manual"} transcript
            </div>
            <div className={styles.transcriptBox}>
              {meeting.transcript_text ? (
                <div className={styles.transcriptLine}>
                  <div className={styles.transcriptText}>{meeting.transcript_text}</div>
                </div>
              ) : (
                <div style={{ color: "var(--ink-3)", fontSize: 13 }}>Transcript not available.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <Button
          variant="destructive"
          disabled={submitting}
          onClick={async () => {
            setSubmitting(true);
            await discardDraftTickets(meeting.id);
            showToast("Drafts discarded. No tickets created.");
            setTimeout(() => router.push("/meetings"), 900);
          }}
        >
          Discard drafts
        </Button>
        <div className={styles.footerRight}>
          <span className={styles.countLabel}>
            {tickets.length} ticket{tickets.length === 1 ? "" : "s"} will be created in backlog
          </span>
          <Button
            variant="primary"
            disabled={submitting || tickets.length === 0}
            onClick={async () => {
              setSubmitting(true);
              await promoteDraftTickets(
                meeting.id,
                meeting.client_id,
                tickets.map((t) => ({ title: t.title, body: t.body, repoId: t.repoId }))
              );
              showToast(`${tickets.length} tickets created in backlog.`);
              setTimeout(() => router.push("/tickets"), 900);
            }}
          >
            Confirm &amp; create tickets
          </Button>
        </div>
      </div>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
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
