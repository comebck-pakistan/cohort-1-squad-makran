"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { StateChip } from "@/components/state/StateChip";
import { RotateCcw } from "lucide-react";
import { formatRelative } from "@/lib/format";
import type { TicketRow, RepoRow } from "@/types/db";
import type { TicketState } from "@/components/state/types";
import styles from "./TicketsBoardScreen.module.css";

type FilterKey = "all" | "action" | "running" | "review" | "done";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "action", label: "Needs action" },
  { key: "running", label: "Agent running" },
  { key: "review", label: "In review" },
  { key: "done", label: "Done" },
];

const ACTION_STATES: TicketState[] = ["needs_human", "awaiting_plan_approval", "review", "changes_requested"];
const RUNNING_STATES: TicketState[] = ["executing", "agent_running"];

function matchesFilter(t: TicketRow, key: FilterKey): boolean {
  if (key === "all") return true;
  if (key === "review") return t.state === "review";
  if (key === "done") return t.state === "done";
  if (key === "running") return RUNNING_STATES.includes(t.state);
  return ACTION_STATES.includes(t.state);
}

function accentFor(state: TicketState): "risk" | "predict" | null {
  if (state === "needs_human") return "risk";
  if (ACTION_STATES.includes(state)) return "predict";
  return null;
}

function actionFor(state: TicketState): { label: string; variant: "primary" | "ghost" } {
  switch (state) {
    case "needs_human":
      return { label: "Reassign", variant: "ghost" };
    case "awaiting_plan_approval":
      return { label: "Review plan", variant: "primary" };
    case "review":
      return { label: "Review PR", variant: "primary" };
    case "done":
      return { label: "View", variant: "ghost" };
    case "backlog":
    case "in_progress":
      return { label: "Assign agent", variant: "ghost" };
    default:
      return { label: "View log", variant: "ghost" };
  }
}

interface TicketsBoardScreenProps {
  initialTickets: TicketRow[];
  repos: RepoRow[];
}

export function TicketsBoardScreen({ initialTickets, repos }: TicketsBoardScreenProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  const needsActionCount = initialTickets.filter((t) => ACTION_STATES.includes(t.state)).length;

  const visibleTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialTickets
      .filter((t) => matchesFilter(t, activeFilter))
      .filter((t) => !q || t.title.toLowerCase().includes(q));
  }, [initialTickets, activeFilter, search]);

  return (
    <div>
      <PageHeader
        title="Tickets"
        action={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" onClick={() => router.refresh()}>
              Refresh
            </Button>
            <Button variant="primary" onClick={() => showToast("New ticket: coming soon.")}>
              New ticket
            </Button>
          </div>
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <div
                key={f.key}
                className={[styles.pill, active && (f.key === "action" ? styles.pillAmberActive : styles.pillActive)]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => setActiveFilter(f.key)}
              >
                {f.label}
                {f.key === "action" && (
                  <span className={[styles.pillBadge, active && styles.pillBadgeActive].filter(Boolean).join(" ")}>
                    {needsActionCount}
                  </span>
                )}
              </div>
            );
          })}
          <div className={styles.spacer} />
          <div className={styles.repoDropdown} onClick={() => showToast("Repo filter: only one repo connected.")}>
            All repos <span style={{ fontSize: 10, color: "var(--ink-3)" }}>▾</span>
          </div>
          <input
            className={styles.searchInput}
            placeholder="Search tickets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.table}>
          <div className={styles.headRow}>
            <span>Ticket</span>
            <span>Repo</span>
            <span>State</span>
            <span>Agent runs</span>
            <span>Updated</span>
            <span />
          </div>

          {visibleTickets.length === 0 ? (
            <div className={styles.empty}>No tickets match this filter.</div>
          ) : (
            visibleTickets.map((t) => {
              const accent = accentFor(t.state);
              const action = actionFor(t.state);
              const repo = repos.find((r) => r.id === t.repo_id)?.full_name ?? "–";
              return (
                <div key={t.id} className={styles.row} onClick={() => router.push(`/tickets/${t.id}`)}>
                  {accent && <div className={[styles.accent, accent === "risk" ? styles.accentRisk : styles.accentPredict].join(" ")} />}
                  <span className={styles.title}>{t.title}</span>
                  <span className={styles.repo}>{repo}</span>
                  <span className={styles.stateCell}>
                    <StateChip state={t.state} />
                    {t.state === "changes_requested" && (
                      <RotateCcw width={13} height={13} color="var(--predict)" strokeWidth={2} />
                    )}
                  </span>
                  <span className={styles.runs}>
                    {t.attempt_count} attempt{t.attempt_count === 1 ? "" : "s"}
                  </span>
                  <span className={styles.updated}>{formatRelative(t.updated_at)}</span>
                  <span className={styles.actionCell}>
                    <Button
                      variant={action.variant}
                      style={{ height: 32, padding: "0 12px", fontSize: 13 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/tickets/${t.id}`);
                      }}
                    >
                      {action.label}
                    </Button>
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
