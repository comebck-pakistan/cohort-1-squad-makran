"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { AddMeetingModal } from "./AddMeetingModal";
import { getClientById } from "@/mock/clients";
import { formatRelative, formatDateTime } from "@/lib/format";
import type { MeetingRow } from "@/types/db";
import styles from "./MeetingsOverviewScreen.module.css";

const NOW = new Date("2026-08-02T14:10:00Z");

interface MeetingsOverviewScreenProps {
  initialMeetings: MeetingRow[];
}

export function MeetingsOverviewScreen({ initialMeetings }: MeetingsOverviewScreenProps) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState<MeetingRow[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const meetings = useMemo(
    () => [...optimistic.filter((o) => !initialMeetings.some((m) => m.id === o.id)), ...initialMeetings],
    [optimistic, initialMeetings]
  );

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  const suggestion = meetings.find(
    (m) => m.status === "scheduled" && !m.known_client && !dismissedIds.includes(m.id)
  );

  const upcoming = useMemo(
    () => meetings.filter((m) => m.status === "scheduled").sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    [meetings]
  );

  const inProgress = meetings.filter((m) => m.status === "processing" || m.status === "in_progress");

  const past = useMemo(
    () =>
      meetings
        .filter((m) => m.status === "ready" || m.status === "failed")
        .sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
    [meetings]
  );

  function botStatusChip(m: MeetingRow) {
    if (!m.known_client) {
      return <span className={[styles.statusPill, styles.statusAwaiting].join(" ")}>Awaiting confirmation</span>;
    }
    return <span className={[styles.statusPill, styles.statusScheduled].join(" ")}>Bot scheduled</span>;
  }

  return (
    <div>
      <PageHeader
        title="Meetings"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={() => router.refresh()}>
              Refresh
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              Add meeting
            </Button>
          </div>
        }
      />
      <div className={styles.content}>
        {suggestion && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                Needs confirmation
              </span>
              <span className={styles.countPill}>1 suggestion</span>
            </div>
            <div className={styles.suggestionCard}>
              <div className={[styles.bar, styles.barPredict].join(" ")} />
              <div style={{ flex: 1, minWidth: 280 }}>
                <div className={styles.eyebrow}>● Action needed · Calendar suggestion</div>
                <div className={styles.cardTitle}>{suggestion.title}</div>
                <div className={styles.cardMeta}>{formatDateTime(suggestion.starts_at)} · Google Meet</div>
                <div className={styles.cardNote}>
                  Detected from calendar · contact not on file, confirm before a bot is sent
                </div>
              </div>
              <div className={styles.cardActions}>
                <Button
                  variant="primary"
                  onClick={() => {
                    setDismissedIds((ids) => [...ids, suggestion.id]);
                    showToast(`Bot will join: ${suggestion.title}.`);
                  }}
                >
                  Confirm &amp; send bot
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDismissedIds((ids) => [...ids, suggestion.id]);
                    showToast("Suggestion dismissed.");
                  }}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.section}>
          <div className={styles.sectionTitle}>Upcoming</div>
          <DataTable
            columns={["Meeting", "Client", "When", "Bot status", "Briefing"]}
            templateColumns="1.5fr 0.9fr 150px 150px 130px"
            rows={upcoming}
            rowKey={(m) => m.id}
            emptyState="No meetings on your calendar yet. Connect Google Calendar in Settings, or add one manually."
            renderRow={(m) => [
              <span key="title" style={{ color: "var(--ink)" }}>{m.title}</span>,
              <span key="client" style={{ color: m.client_id ? "var(--ink-2)" : "var(--ink-3)" }}>
                {m.client_id ? getClientById(m.client_id)?.name : "–"}
              </span>,
              <span key="when" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>
                {formatDateTime(m.starts_at)}
              </span>,
              botStatusChip(m),
              m.known_client ? (
                <a
                  key="briefing"
                  href="#"
                  style={{ fontSize: 13 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/meetings/${m.id}/briefing`);
                  }}
                >
                  Preview →
                </a>
              ) : (
                <span key="briefing" style={{ color: "var(--ink-3)" }}>
                  –
                </span>
              ),
            ]}
          />
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>In progress</div>
          {inProgress.length === 0 ? (
            <div style={{ color: "var(--ink-3)", fontSize: 13 }}>No calls in progress right now.</div>
          ) : (
            inProgress.map((m) => (
              <div key={m.id} className={styles.suggestionCard}>
                <div className={[styles.bar, styles.barSignal].join(" ")} />
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div className={styles.cardTitle}>{m.title}</div>
                  <div className={styles.cardNote}>
                    Started {formatRelative(m.starts_at, NOW)} · transcript processing
                  </div>
                </div>
                <div className={styles.progressRight}>
                  <div className={styles.progressLine}>
                    <span className={styles.progressDot} />
                    <span className={styles.progressLabel}>Processing</span>
                  </div>
                  <div className={styles.progressNote}>Hit Refresh once processing finishes.</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          <div className={styles.sectionTitle}>Past meetings</div>
          <DataTable
            columns={["Meeting", "Client", "Date", "Transcript", "Tickets"]}
            templateColumns="1.4fr 1fr 130px 130px 170px"
            rows={past}
            rowKey={(m) => m.id}
            emptyState="No past meetings yet. Once a call ends, the transcript and draft tickets show up here."
            renderRow={(m) => {
              const transcriptChip =
                m.status === "failed" ? (
                  <span className={[styles.statusPill, styles.statusFailed].join(" ")}>Failed to process</span>
                ) : m.source === "manual_paste" ? (
                  <span className={[styles.statusPill, styles.statusNeutral].join(" ")}>Manual paste</span>
                ) : (
                  <span className={[styles.statusPill, styles.statusReady].join(" ")}>Ready</span>
                );

              const ticketsCell =
                m.status === "failed" ? (
                  <span style={{ color: "var(--ink-3)" }}>–</span>
                ) : m.draft_tickets.length > 0 ? (
                  <a
                    href="#"
                    className={styles.draftLink}
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/meetings/${m.id}/review`);
                    }}
                  >
                    Draft review pending
                  </a>
                ) : (
                  <span style={{ color: "var(--ink-3)" }}>–</span>
                );

              return [
                <span key="title" style={{ color: "var(--ink)" }}>{m.title}</span>,
                <span key="client" style={{ color: m.client_id ? "var(--ink-2)" : "var(--ink-3)" }}>
                  {m.client_id ? getClientById(m.client_id)?.name : "–"}
                </span>,
                <span key="date" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)" }}>
                  {new Date(m.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>,
                transcriptChip,
                ticketsCell,
              ];
            }}
          />
        </div>
      </div>

      {modalOpen && (
        <AddMeetingModal
          onClose={() => setModalOpen(false)}
          onCreated={(meeting, msg) => {
            setModalOpen(false);
            setOptimistic((ms) => [meeting, ...ms]);
            showToast(msg);
            setTimeout(() => router.refresh(), 3000);
          }}
        />
      )}

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
