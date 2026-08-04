"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { StateChip } from "@/components/state/StateChip";
import { Calendar } from "lucide-react";
import { formatRelative, formatDateTime } from "@/lib/format";
import type { TicketRow, MeetingRow, ProposalRow, RepoRow, ClientRow } from "@/types/db";
import styles from "./HomeScreen.module.css";

const NOW = new Date("2026-08-02T14:10:00Z");

interface AttentionTicket {
  ticket: TicketRow;
  label: string;
  cta: string;
  body: string;
}

interface HomeScreenProps {
  tickets: TicketRow[];
  meetings: MeetingRow[];
  proposals: ProposalRow[];
  repos: RepoRow[];
  clients: ClientRow[];
}

export function HomeScreen({ tickets, meetings, proposals, repos, clients }: HomeScreenProps) {
  const router = useRouter();
  const [meetingDismissed, setMeetingDismissed] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  function repoName(repoId: string | null): string {
    return repos.find((r) => r.id === repoId)?.full_name ?? "–";
  }

  function clientName(clientId: string | null): string {
    return clients.find((c) => c.id === clientId)?.name ?? "–";
  }

  const attentionTickets: AttentionTicket[] = useMemo(
    () =>
      tickets
        .filter((t) => t.state === "awaiting_plan_approval" || t.state === "review")
        .map((t) => ({
          ticket: t,
          label: t.state === "awaiting_plan_approval" ? "Ticket" : "Ticket",
          cta: t.state === "awaiting_plan_approval" ? "Review plan" : "Review PR",
          body:
            t.state === "awaiting_plan_approval"
              ? "Agent has produced a plan. Review before execution begins."
              : `PR opened on ${repoName(t.repo_id)}. Ready to merge.`,
        })),
    [tickets, repos]
  );

  const suggestedMeeting = meetings.find((m) => m.status === "scheduled" && !m.known_client);

  const activeTickets = useMemo(
    () => [...tickets].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 4),
    [tickets]
  );

  const upcomingMeetings = useMemo(
    () =>
      meetings
        .filter((m) => m.status === "scheduled")
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .slice(0, 3),
    [meetings]
  );

  const recentProposals = useMemo(
    () => [...proposals].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 3),
    [proposals]
  );

  const attentionCount = attentionTickets.length + (suggestedMeeting && !meetingDismissed ? 1 : 0);

  return (
    <div>
      <PageHeader title="Home" />
      <div className={styles.content}>
        <div className={styles.sectionHead}>
          <span className={styles.sectionTitle}>Needs your attention</span>
          <span className={styles.countPill}>{attentionCount} items</span>
        </div>

        <div className={styles.attentionGrid}>
          {attentionCount === 0 && (
            <div className={styles.attentionEmpty}>
              Nothing needs you right now. New plans, PRs, and meeting suggestions will show up here.
            </div>
          )}

          {attentionTickets.map((a) => (
            <div key={a.ticket.id} className={styles.attentionCard}>
              <div className={styles.attentionBar} />
              <div className={styles.attentionEyebrow}>● Action needed · {a.label}</div>
              <div className={styles.attentionTitle}>{a.ticket.title}</div>
              <div className={styles.attentionChip}>
                <StateChip state={a.ticket.state} />
              </div>
              <div className={styles.attentionBody}>{a.body}</div>
              <Button variant="primary" onClick={() => router.push(`/tickets/${a.ticket.id}`)}>
                {a.cta}
              </Button>
            </div>
          ))}

          {suggestedMeeting && !meetingDismissed && (
            <div className={styles.attentionCard}>
              <div className={styles.attentionBar} />
              <div className={styles.attentionEyebrow}>● Action needed · Meeting</div>
              <div className={styles.attentionTitle}>{suggestedMeeting.title}</div>
              <div className={styles.attentionBody}>
                {formatDateTime(suggestedMeeting.starts_at)} · Unknown contact, confirm to send a bot.
              </div>
              <div className={styles.attentionActions}>
                <Button
                  variant="primary"
                  onClick={() => {
                    setMeetingDismissed(true);
                    showToast(`Bot will join: ${suggestedMeeting.title}.`);
                  }}
                >
                  Confirm &amp; send bot
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setMeetingDismissed(true);
                    showToast("Suggestion dismissed.");
                  }}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.twoCol}>
          <div>
            <div className={styles.sectionHead} style={{ justifyContent: "space-between" }}>
              <span className={styles.sectionTitle}>Active tickets</span>
              <Link href="/tickets" className={styles.viewAll}>
                View all →
              </Link>
            </div>
            <DataTable
              columns={["Ticket", "Repo", "State", "Updated"]}
              templateColumns="1fr 170px 170px 100px"
              rows={activeTickets}
              rowKey={(t) => t.id}
              onRowClick={(t) => router.push(`/tickets/${t.id}`)}
              emptyState="No tickets yet. Draft tickets appear here once a meeting is processed."
              renderRow={(t) => [
                <span key="title" style={{ color: "var(--ink)" }}>{t.title}</span>,
                <span key="repo" style={{ color: "var(--ink-3)", fontSize: 13 }}>{repoName(t.repo_id)}</span>,
                <StateChip key="state" state={t.state} />,
                <span key="updated" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-3)", fontSize: 12 }}>
                  {formatRelative(t.updated_at, NOW)}
                </span>,
              ]}
            />
          </div>

          <div>
            <div className={styles.sectionHead} style={{ justifyContent: "space-between" }}>
              <span className={styles.sectionTitle}>Upcoming meetings</span>
              <Link href="/meetings" className={styles.viewAll}>
                View all →
              </Link>
            </div>
            {upcomingMeetings.length === 0 ? (
              <div className={styles.meetingEmpty}>
                No meetings scheduled. Add one manually from Meetings.
              </div>
            ) : (
              <div className={styles.meetingList}>
                {upcomingMeetings.map((m) => (
                  <div key={m.id} className={styles.meetingRow}>
                    <Calendar className={styles.meetingIcon} width={16} height={16} color="var(--ink-3)" strokeWidth={1.5} />
                    <div className={styles.meetingInfo}>
                      <div className={styles.meetingTitle}>{m.title}</div>
                      <div className={styles.meetingTime}>{formatDateTime(m.starts_at)}</div>
                    </div>
                    <span
                      className={[
                        styles.meetingBadge,
                        m.known_client ? styles.meetingBadgeScheduled : styles.meetingBadgeSuggestion,
                      ].join(" ")}
                    >
                      {m.known_client ? "Bot scheduled" : "Suggestion"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className={styles.sectionHead} style={{ justifyContent: "space-between" }}>
            <span className={styles.sectionTitle}>Recent proposals</span>
            <Link href="/proposals" className={styles.viewAll}>
              View all →
            </Link>
          </div>
          <DataTable
            columns={["Proposal", "Client", "Status", "Sent"]}
            templateColumns="1.4fr 1fr 120px 120px"
            rows={recentProposals}
            rowKey={(p) => p.id}
            onRowClick={() => router.push("/proposals")}
            emptyState="No proposals yet. Import past work from Settings to start drafting in your voice."
            renderRow={(p) => [
              <span key="title" style={{ color: "var(--ink)" }}>{p.title}</span>,
              <span key="client" style={{ color: "var(--ink-2)" }}>{clientName(p.client_id)}</span>,
              <StateChip key="state" state={p.state} />,
              <span key="sent" style={{ fontFamily: "var(--font-mono)", color: "var(--ink-3)", fontSize: 12 }}>
                {p.sent_at ? formatRelative(p.sent_at, NOW) : "Not sent"}
              </span>,
            ]}
          />
        </div>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
