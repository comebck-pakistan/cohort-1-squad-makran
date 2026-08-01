"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { getMeetingById } from "@/mock/meetings";
import { getClientById } from "@/mock/clients";
import { mockRepos } from "@/mock/integrations";
import styles from "./MeetingDraftReviewScreen.module.css";

interface DraftTicketDraft {
  id: string;
  title: string;
  body: string;
  repo: string;
}

const TRANSCRIPT = [
  { time: "00:02", speaker: "Jordan", text: "Okay so the big thing this sprint is getting Stripe webhooks wired up before the demo.", highlight: true },
  { time: "00:14", speaker: "Marcus", text: "Right, and we need to handle both success and failure cases, not just the happy path.", highlight: false },
  { time: "00:31", speaker: "Jordan", text: "Agreed. Also the .env config needs updating; I keep forgetting that every deploy.", highlight: true },
  { time: "00:45", speaker: "Marcus", text: "Should we add logging for anything we don't handle yet? Just so we know what's hitting the endpoint.", highlight: false },
  { time: "01:02", speaker: "Jordan", text: "Yes, definitely. Low effort, high signal.", highlight: false },
];

interface MeetingDraftReviewScreenProps {
  meetingId: string;
}

export function MeetingDraftReviewScreen({ meetingId }: MeetingDraftReviewScreenProps) {
  const router = useRouter();
  const meeting = getMeetingById(meetingId);
  const client = meeting?.client_id ? getClientById(meeting.client_id) : undefined;
  const defaultRepo = mockRepos.find((r) => r.is_default)?.full_name ?? "–";

  const [tickets, setTickets] = useState<DraftTicketDraft[]>(
    (meeting?.draft_tickets ?? []).map((t, i) => ({
      id: `draft_${i}`,
      title: t.title,
      body: t.description,
      repo: defaultRepo,
    }))
  );
  const [expandedId, setExpandedId] = useState<string | null>(tickets[0]?.id ?? null);
  const [mergeDismissed, setMergeDismissed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
                const showMerge = i === 1 && !mergeDismissed && tickets.length > 2;
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
                            <span className={styles.repoValue}>{t.repo}</span>
                            <div style={{ flex: 1 }} />
                            <button
                              className={styles.iconBtn}
                              title="Split into two tickets"
                              onClick={() => showToast("Split into two tickets: coming soon.")}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <path d="M12 4v7M12 11c-3 0-5 2-5 5v2M12 11c3 0 5 2 5 5v2" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="12" cy="4" r="1.6" />
                                <circle cx="7" cy="20" r="1.6" />
                                <circle cx="17" cy="20" r="1.6" />
                              </svg>
                            </button>
                            <button className={styles.iconBtn} onClick={() => deleteTicket(t.id)}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7h10z" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={styles.collapsedRow}>
                            <span className={styles.collapsedTitle}>{t.title}</span>
                            <div className={styles.collapsedActions}>
                              <button className={styles.editLink} onClick={() => setExpandedId(t.id)}>
                                Edit
                              </button>
                              <button className={styles.iconBtn} onClick={() => deleteTicket(t.id)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                                  <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7h10z" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          {showMerge && (
                            <div className={styles.mergeSuggestion}>
                              <span className={styles.mergeText}>Merge suggestion: similar to another draft, consider combining</span>
                              <button
                                className={styles.mergeLink}
                                onClick={() => {
                                  deleteTicket(t.id);
                                  showToast(`Merged into "${tickets[0]?.title}".`);
                                }}
                              >
                                Merge
                              </button>
                              <button className={styles.mergeKeepLink} onClick={() => setMergeDismissed(true)}>
                                Keep separate
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.addManual}>
              <button className={styles.addManualLink} onClick={() => showToast("Add ticket manually: coming soon.")}>
                + Add ticket manually
              </button>
            </div>
          </div>

          <div>
            <div className={styles.colTitle}>Transcript</div>
            <div className={styles.transcriptMeta}>
              {meeting.title} · Recall bot · {meeting.transcript_source ?? "manual"} transcript
            </div>
            <div className={styles.transcriptBox}>
              {TRANSCRIPT.map((line, i) => (
                <div key={i} className={[styles.transcriptLine, line.highlight && styles.transcriptLineHighlight].filter(Boolean).join(" ")}>
                  <div className={styles.transcriptHead}>
                    <span className={styles.transcriptTime}>{line.time}</span>{" "}
                    <span className={styles.transcriptSpeaker}>{line.speaker}</span>
                  </div>
                  <div className={styles.transcriptText}>{line.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <Button variant="destructive" onClick={() => showToast("Drafts discarded. No tickets created.")}>
          Discard drafts
        </Button>
        <div className={styles.footerRight}>
          <span className={styles.countLabel}>
            {tickets.length} ticket{tickets.length === 1 ? "" : "s"} will be created in backlog
          </span>
          <Button
            variant="primary"
            onClick={() => {
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
