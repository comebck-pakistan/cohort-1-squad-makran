"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, List, Plus, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { AddMeetingModal } from "./AddMeetingModal";
import { CalendarWeekView } from "./CalendarWeekView";
import { confirmCalendarSuggestion, dismissCalendarSuggestion } from "@/lib/actions/meetings";
import { formatRelative, formatDateTime } from "@/lib/format";
import type { MeetingRow, ClientRow } from "@/types/db";
import styles from "./MeetingsOverviewScreen.module.css";

interface MeetingsOverviewScreenProps {
  initialMeetings: MeetingRow[];
  clients: ClientRow[];
}

export function MeetingsOverviewScreen({ initialMeetings, clients }: MeetingsOverviewScreenProps) {
  const router = useRouter();
  function clientName(clientId: string | null): string | undefined {
    return clients.find((c) => c.id === clientId)?.name;
  }
  const [optimistic, setOptimistic] = useState<MeetingRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "week">("list");
  // One Refresh for the whole screen: it re-renders the server data and re-pulls the week.
  const [refreshKey, setRefreshKey] = useState(0);
  const [slotStart, setSlotStart] = useState<Date | null>(null);

  function refreshAll() {
    setRefreshKey((k) => k + 1);
    router.refresh();
  }

  function openModal(start: Date | null) {
    setSlotStart(start);
    setModalOpen(true);
  }
  // Set after mount, not at render: a server-rendered "now" would mismatch on hydration.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 60_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  const meetings = useMemo(
    () => [...optimistic.filter((o) => !initialMeetings.some((m) => m.id === o.id)), ...initialMeetings],
    [optimistic, initialMeetings]
  );

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  // Calendar-detected events with an unrecognised attendee list: no bot has been sent for these
  // yet, so a real confirm is still outstanding. A sent bot (skribby_bot_id) clears the card.
  const suggestions = useMemo(
    () =>
      meetings.filter(
        (m) => m.status === "scheduled" && m.google_event_id && !m.known_client && !m.skribby_bot_id
      ),
    [meetings]
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
    // The bot id is the honest signal: it exists only once a bot has actually been requested.
    if (!m.skribby_bot_id) {
      return <span className={[styles.statusPill, styles.statusAwaiting].join(" ")}>Awaiting confirmation</span>;
    }
    return <span className={[styles.statusPill, styles.statusScheduled].join(" ")}>Bot scheduled</span>;
  }

  return (
    <div>
      <PageHeader
        title="Meetings"
        action={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={[styles.viewBtn, view === "list" ? styles.viewBtnOn : ""].join(" ")}
                onClick={() => setView("list")}
              >
                <List width={14} height={14} strokeWidth={1.8} />
                List
              </button>
              <button
                type="button"
                className={[styles.viewBtn, view === "week" ? styles.viewBtnOn : ""].join(" ")}
                onClick={() => setView("week")}
              >
                <CalendarDays width={14} height={14} strokeWidth={1.8} />
                Week
              </button>
            </div>
            <Button variant="secondary" onClick={refreshAll}>
              <RefreshCw width={14} height={14} strokeWidth={1.8} />
              Refresh
            </Button>
            <Button variant="primary" onClick={() => openModal(null)}>
              <Plus width={14} height={14} strokeWidth={1.8} />
              Add meeting
            </Button>
          </div>
        }
      />
      <div className={styles.content}>
        {suggestions.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <span className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                Needs confirmation
              </span>
              <span className={styles.countPill}>
                {suggestions.length} suggestion{suggestions.length === 1 ? "" : "s"}
              </span>
            </div>
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className={styles.suggestionCard}>
                <div className={[styles.bar, styles.barPredict].join(" ")} />
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div className={styles.eyebrow}>● Action needed · Calendar suggestion</div>
                  <div className={styles.cardTitle}>{suggestion.title}</div>
                  <div className={styles.cardMeta}>{formatDateTime(suggestion.starts_at)} · Video call</div>
                  <div className={styles.cardNote}>
                    Detected from your Google Calendar · contact not on file, confirm before a bot is sent
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <Button
                    variant="primary"
                    disabled={busyId !== null}
                    onClick={async () => {
                      setBusyId(suggestion.id);
                      try {
                        await confirmCalendarSuggestion(suggestion.id);
                        showToast(`Bot will join: ${suggestion.title}.`);
                        router.refresh();
                      } catch (err) {
                        showToast(err instanceof Error ? err.message : "Could not send the bot.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    {busyId === suggestion.id ? "Sending…" : "Confirm & send bot"}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busyId !== null}
                    onClick={async () => {
                      setBusyId(suggestion.id);
                      try {
                        await dismissCalendarSuggestion(suggestion.id);
                        showToast("Suggestion dismissed.");
                        router.refresh();
                      } catch (err) {
                        showToast(err instanceof Error ? err.message : "Could not dismiss.");
                      } finally {
                        setBusyId(null);
                      }
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === "week" && (
          <CalendarWeekView meetings={meetings} refreshKey={refreshKey} onSlotClick={(start) => openModal(start)} />
        )}

        <div className={styles.section} hidden={view !== "list"}>
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
                {m.client_id ? clientName(m.client_id) : "–"}
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

        <div className={styles.section} hidden={view !== "list"}>
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
                    Started {now ? formatRelative(m.starts_at, now) : formatDateTime(m.starts_at)} · transcript
                    processing
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

        <div hidden={view !== "list"}>
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
                  <span
                    className={[styles.statusPill, styles.statusFailed].join(" ")}
                    title={m.failure_reason ?? "Processing failed for an unknown reason."}
                  >
                    Failed to process
                  </span>
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
                  {m.client_id ? clientName(m.client_id) : "–"}
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
          key={slotStart ? slotStart.toISOString() : "blank"}
          clients={clients}
          initialStart={slotStart ?? undefined}
          onClose={() => {
            setModalOpen(false);
            setSlotStart(null);
          }}
          onCreated={(meeting, msg) => {
            setModalOpen(false);
            setSlotStart(null);
            setOptimistic((ms) => [meeting, ...ms]);
            showToast(msg);
            setTimeout(refreshAll, 3000);
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
