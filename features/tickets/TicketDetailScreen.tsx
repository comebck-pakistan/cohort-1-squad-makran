"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StateChip } from "@/components/state/StateChip";
import { ConsoleLog, type ConsoleLine } from "@/components/console/ConsoleLog";
import { CostEstimateModule } from "@/components/epistemic/CostEstimateModule";
import { assignAgentToTicket, reassignAgentToTicket, submitPlanDecision, submitReviewDecision } from "@/lib/actions/tickets";
import type { TicketRow, AgentRunRow, ClientRow } from "@/types/db";
import type { CostEstimate } from "@/lib/db/agent-runs";
import styles from "./TicketDetailScreen.module.css";

const HISTORY_BASE = [{ time: "Created", text: "Ticket created from meeting draft", tone: "default" as const }];

const RUNNING_STATES = ["agent_running", "executing"];

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface TicketDetailScreenProps {
  ticket: TicketRow;
  runs: AgentRunRow[];
  repoFullName: string | null;
  costEstimate: CostEstimate | null;
  clients: ClientRow[];
}

export function TicketDetailScreen({ ticket, runs, repoFullName, costEstimate, clients }: TicketDetailScreenProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [changesText, setChangesText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  useEffect(() => {
    if (!RUNNING_STATES.includes(ticket.state)) return;
    const interval = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(interval);
  }, [ticket.state, router]);

  const repo = repoFullName ?? "–";
  const client = ticket.client_id ? clients.find((c) => c.id === ticket.client_id) : undefined;
  const totalSpentCents = runs.reduce((sum, r) => sum + r.token_cost, 0);
  const currentRun = runs[runs.length - 1];
  const logLines: ConsoleLine[] = (currentRun?.log as unknown as ConsoleLine[]) ?? [];

  const history = [...HISTORY_BASE];
  if (ticket.state !== "backlog" && ticket.state !== "in_progress") {
    history.push({ time: "In progress", text: "Agent assigned", tone: "default" });
  }

  async function handleAssign() {
    setBusy(true);
    try {
      await assignAgentToTicket(ticket.id);
      showToast("Agent assigned, generating a plan…");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handlePlanDecision(approved: boolean) {
    setBusy(true);
    try {
      await submitPlanDecision({ ticketId: ticket.id, approved, feedback: feedback || undefined });
      showToast(approved ? "Plan approved. Execution starting…" : "Plan rejected, agent will re-plan with your feedback.");
      setFeedback("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleReviewDecision(approved: boolean) {
    setBusy(true);
    try {
      await submitReviewDecision({ ticketId: ticket.id, approved, feedback: changesText || undefined });
      showToast(approved ? "Merging PR…" : "Requesting changes, starting a new plan/execute cycle.");
      setChangesText("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleReassign() {
    setBusy(true);
    try {
      await reassignAgentToTicket(ticket.id);
      showToast("Reassigned, starting a fresh plan.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <Link href="/tickets" style={{ color: "var(--ink-3)" }}>
            Tickets
          </Link>{" "}
          → {ticket.title}
        </div>
        <div className={styles.title}>{ticket.title}</div>
        <div className={styles.meta}>
          <StateChip state={ticket.state} />
          <span>
            · {repo} {client ? `· ${client.name}` : ""} · {runs.length} agent run{runs.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {ticket.state === "awaiting_plan_approval" && (
        <div className={styles.bannerWrap}>
          <div className={[styles.banner, styles.bannerPredict].join(" ")}>
            <div className={[styles.bannerBar, styles.bannerBarPredict].join(" ")} />
            <span className={styles.bannerTextPredict}>
              ● Action needed · Awaiting plan approval: review the plan below before the agent writes any code.
            </span>
          </div>
        </div>
      )}

      {ticket.state === "review" && (
        <div className={styles.bannerWrap}>
          <div className={[styles.banner, styles.bannerPredict].join(" ")}>
            <div className={[styles.bannerBar, styles.bannerBarPredict].join(" ")} />
            <span className={styles.bannerTextPredict}>
              ● Action needed · PR ready: review and merge, or request changes.
            </span>
          </div>
        </div>
      )}

      {ticket.state === "needs_human" && (
        <div className={styles.bannerWrap}>
          <div className={[styles.banner, styles.bannerRisk].join(" ")}>
            <div className={[styles.bannerBar, styles.bannerBarRisk].join(" ")} />
            <span className={styles.bannerTextRisk}>
              ● Action needed · Agent stopped after {ticket.attempt_count} attempts: reassign or edit manually.
            </span>
          </div>
        </div>
      )}

      <div className={styles.body}>
        <div className={styles.grid}>
          <div>
            {(ticket.state === "backlog" || ticket.state === "in_progress") && (
              <Card raised>
                <div className={styles.cardBlockTitle}>Not started yet</div>
                <div className={styles.emptyCard} style={{ marginBottom: 16 }}>
                  This ticket hasn&rsquo;t been picked up by the agent yet. Assign it to start the
                  plan/execute/review loop.
                </div>
                <Button variant="primary" onClick={handleAssign} disabled={busy || !repoFullName}>
                  Assign agent
                </Button>
                {!repoFullName && (
                  <div className={styles.fileNote} style={{ marginTop: 8 }}>
                    Connect a repo in Settings → Integrations first.
                  </div>
                )}
              </Card>
            )}

            {ticket.state === "awaiting_plan_approval" && (
              <>
                <div className={styles.sectionTitleRow}>
                  <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                    Agent plan
                  </div>
                </div>
                <Card raised>
                  <div className={styles.cardBlockTitle}>Approach</div>
                  <div className={styles.paragraph} style={{ whiteSpace: "pre-wrap" }}>
                    {ticket.plan_summary}
                  </div>

                  <div className={styles.divider}>
                    <div className={styles.cardBlockTitle}>Your feedback (optional)</div>
                    <textarea
                      className={styles.textarea}
                      placeholder="Add notes or constraints before approving, e.g. 'Don't change the mobile layout.'"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                    <div className={styles.formActions}>
                      <Button variant="destructive" onClick={() => handlePlanDecision(false)} disabled={busy}>
                        Reject &amp; re-plan
                      </Button>
                      <Button variant="primary" onClick={() => handlePlanDecision(true)} disabled={busy}>
                        Approve plan
                      </Button>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {(ticket.state === "executing" || ticket.state === "agent_running") && (
              <>
                <div className={styles.consoleHeadRow}>
                  <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                    Live execution log
                  </div>
                  <div className={styles.runningTag}>
                    <span className={styles.runningDot} />
                    <span className={styles.runningLabel}>Running</span>
                  </div>
                </div>
                {logLines.length > 0 ? (
                  <ConsoleLog lines={logLines.map((l, i) => (i === logLines.length - 1 ? { ...l, active: true } : l))} />
                ) : (
                  <ConsoleLog lines={[{ time: "", text: ticket.state === "agent_running" ? "Generating plan…" : "Starting…", active: true }]} />
                )}
                <div className={styles.spentBox}>
                  <div className={styles.factRow}>
                    <span className={styles.factDot}>●</span>
                    <span className={styles.factLabel}>Spent so far</span>
                    <span className={styles.factValue}>{dollars(totalSpentCents)}</span>
                  </div>
                  <div className={styles.factCaption}>logged · updating live</div>
                </div>
              </>
            )}

            {ticket.state === "review" && (
              <>
                <Card raised style={{ marginBottom: 20 }}>
                  <div className={styles.cardBlockTitle} style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".02em", color: "var(--ink-3)" }}>
                    Pull request · {repo}
                  </div>
                  <div className={styles.cardBlockTitle}>{ticket.title}</div>
                  <a href={ticket.pr_url ?? "#"} style={{ fontSize: 14, fontWeight: 500 }} target="_blank" rel="noreferrer">
                    View PR on GitHub ↗
                  </a>
                </Card>

                <Card raised style={{ marginBottom: 20 }}>
                  <div className={styles.cardBlockTitle}>Request changes (optional)</div>
                  <textarea
                    className={styles.textarea}
                    placeholder="Describe what needs to change, the agent will re-plan and try again."
                    value={changesText}
                    onChange={(e) => setChangesText(e.target.value)}
                  />
                  <div className={styles.fileNote} style={{ marginBottom: 16 }}>
                    This starts a new plan/execute cycle. Attempt {ticket.attempt_count} of 3.
                  </div>
                  <div className={styles.formActions}>
                    <Button variant="destructive" onClick={() => handleReviewDecision(false)} disabled={busy}>
                      Request changes
                    </Button>
                    <Button variant="primary" onClick={() => handleReviewDecision(true)} disabled={busy}>
                      Approve &amp; merge
                    </Button>
                  </div>
                </Card>
              </>
            )}

            {ticket.state === "changes_requested" && (
              <Card raised>
                <div className={styles.cardBlockTitle}>Changes requested</div>
                <div className={styles.paragraph}>
                  You asked the agent to revise its work. It&rsquo;s generating a new plan based on
                  your feedback. You&rsquo;ll get another approval gate once that&rsquo;s ready.
                </div>
                <div className={styles.fileNote}>Attempt {ticket.attempt_count} of 3.</div>
              </Card>
            )}

            {ticket.state === "needs_human" && (
              <Card raised>
                <div className={styles.cardBlockTitle}>Agent stopped</div>
                <div className={styles.paragraph}>
                  {ticket.failure_reason ??
                    `The agent tried this ticket ${ticket.attempt_count} times and hit the retry cap without a passing run.`}{" "}
                  No further automatic attempts will run.
                </div>
                <div className={styles.formActions} style={{ justifyContent: "flex-start" }}>
                  <Button variant="secondary" onClick={handleReassign} disabled={busy}>
                    Reassign to agent
                  </Button>
                  <Button variant="ghost" onClick={() => showToast("Manual ticket editing: coming soon.")}>
                    Edit ticket manually
                  </Button>
                </div>
              </Card>
            )}

            {ticket.state === "done" && (
              <Card raised>
                <div className={styles.factRow}>
                  <span className={styles.factDot}>●</span>
                  <span className={styles.factLabel}>Completed</span>
                </div>
                <div className={styles.paragraph} style={{ marginTop: 8 }}>
                  Execution finished and the PR was merged. Total cost logged below.
                </div>
                {ticket.pr_url && (
                  <a href={ticket.pr_url} style={{ fontSize: 14, fontWeight: 500 }} target="_blank" rel="noreferrer">
                    View merged PR on GitHub ↗
                  </a>
                )}
              </Card>
            )}
          </div>

          <div>
            {(ticket.state === "awaiting_plan_approval" || ticket.state === "backlog" || ticket.state === "in_progress") && (
              <>
                <div className={styles.sectionTitle}>Cost estimate</div>
                <Card raised style={{ marginBottom: 24 }}>
                  <CostEstimateModule
                    spent={{ value: dollars(totalSpentCents), caption: "ticketization + plan generation, logged" }}
                    estimate={
                      costEstimate
                        ? {
                            value: `${dollars(costEstimate.minCents)}–${dollars(costEstimate.maxCents)}`,
                            evidence: `based on ${costEstimate.runCount} past run${costEstimate.runCount === 1 ? "" : "s"}`,
                          }
                        : undefined
                    }
                  />
                </Card>
              </>
            )}

            {(ticket.state === "executing" || ticket.state === "agent_running") && ticket.plan_summary && (
              <>
                <div className={styles.sectionTitle}>Approved plan</div>
                <Card raised style={{ marginBottom: 24 }}>
                  <div className={styles.paragraph} style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                    {ticket.plan_summary}
                  </div>
                </Card>
              </>
            )}

            {(ticket.state === "review" || ticket.state === "needs_human") && (
              <>
                <div className={styles.sectionTitle}>{ticket.state === "review" ? "Run cost" : "Cost so far"}</div>
                <Card raised style={{ marginBottom: 24 }}>
                  <div className={styles.factRow}>
                    <span className={styles.factDot}>●</span>
                    <span className={styles.factLabel}>Total spent</span>
                    <span className={styles.factValue}>{dollars(totalSpentCents)}</span>
                  </div>
                  <div className={styles.factCaption}>
                    {runs.length} attempt{runs.length === 1 ? "" : "s"} · logged
                  </div>
                </Card>
              </>
            )}

            <div className={styles.sectionTitle}>History</div>
            <Card raised>
              <div className={styles.historyList}>
                {history.map((h, i) => (
                  <div key={i}>
                    <span className={styles.historyTime}>{h.time}</span>
                    <div className={styles.historyText}>{h.text}</div>
                  </div>
                ))}
                {ticket.state === "needs_human" && (
                  <div>
                    <span className={styles.historyTime}>Now</span>
                    <div className={[styles.historyText, styles.historyTextRisk].join(" ")}>
                      Stopped after {ticket.attempt_count} failed attempts: needs human
                    </div>
                  </div>
                )}
                {ticket.state === "review" && (
                  <div>
                    <span className={styles.historyTime}>Now</span>
                    <div className={[styles.historyText, styles.historyTextPredict].join(" ")}>Awaiting your review</div>
                  </div>
                )}
                {(ticket.state === "executing" || ticket.state === "agent_running") && (
                  <div>
                    <span className={styles.historyTime}>Now</span>
                    <div className={[styles.historyText, styles.historyTextSignal].join(" ")}>
                      {ticket.state === "agent_running" ? "Generating plan" : "Executing"}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
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
