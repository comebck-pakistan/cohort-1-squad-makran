"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StateChip } from "@/components/state/StateChip";
import { ConsoleLog } from "@/components/console/ConsoleLog";
import { CostEstimateModule } from "@/components/epistemic/CostEstimateModule";
import { getTicketById, mockAgentRuns } from "@/mock/tickets";
import { mockRepos } from "@/mock/integrations";
import { getClientById } from "@/mock/clients";
import styles from "./TicketDetailScreen.module.css";

const FileIcon = () => (
  <svg className={styles.fileIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.6">
    <path d="M6 2h9l5 5v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 2v5h5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PLAN_FILES = [
  { path: "src/components/CartSummary.tsx", note: "update pricing API call" },
  { path: "src/components/CheckoutForm.tsx", note: "refactor field order" },
  { path: "src/hooks/useCheckoutValidation.ts", note: "new file" },
];

const LOG_LINES = [
  { time: "10:51:02", text: "Checked out branch: agent/ticket-fix", ok: true },
  { time: "10:51:14", text: "Edited: src/components/CartSummary.tsx", ok: true },
  { time: "10:51:28", text: "Created: src/hooks/useCheckoutValidation.ts", ok: true },
  { time: "10:51:33", text: "Running tests…", active: true },
];

const HISTORY_BASE = [
  { time: "Mon Aug 28 09:15", text: "Ticket created from meeting draft", tone: "default" as const },
  { time: "Mon Aug 28 10:38", text: "Agent assigned", tone: "default" as const },
];

interface TicketDetailScreenProps {
  ticketId: string;
}

export function TicketDetailScreen({ ticketId }: TicketDetailScreenProps) {
  const router = useRouter();
  const ticket = getTicketById(ticketId);
  const [feedback, setFeedback] = useState("");
  const [changesText, setChangesText] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  if (!ticket) {
    return (
      <div style={{ padding: 40 }}>
        <p style={{ color: "var(--ink-3)" }}>Ticket not found.</p>
      </div>
    );
  }

  const repo = mockRepos.find((r) => r.id === ticket.repo_id)?.full_name ?? "–";
  const client = ticket.client_id ? getClientById(ticket.client_id) : undefined;
  const runs = mockAgentRuns.filter((r) => r.ticket_id === ticket.id);
  const totalSpent = runs.reduce((sum, r) => sum + r.token_cost, 0);

  const history = [...HISTORY_BASE];
  if (ticket.state !== "backlog" && ticket.state !== "in_progress") {
    history.push({ time: "Mon Aug 28 10:42", text: "Plan generated", tone: "default" });
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
                <Button variant="primary" onClick={() => showToast("Agent assigned, generating a plan…")}>
                  Assign agent
                </Button>
              </Card>
            )}

            {ticket.state === "awaiting_plan_approval" && (
              <>
                <div className={styles.sectionTitleRow}>
                  <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>
                    Agent plan
                  </div>
                  <span className={styles.timestamp}>Generated · Aug 28, 10:42 AM</span>
                </div>
                <Card raised>
                  <div className={styles.cardBlockTitle}>Approach</div>
                  <div className={styles.paragraph}>{ticket.plan_summary}</div>

                  <div className={styles.cardBlockTitle}>Files I plan to touch</div>
                  <div className={styles.fileList}>
                    {PLAN_FILES.map((f) => (
                      <div key={f.path} className={styles.fileRow}>
                        <FileIcon />
                        <span className={styles.filePath}>{f.path}</span>
                        <span className={styles.fileNote}>· {f.note}</span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.cardBlockTitle}>What I will not do</div>
                  <div className={styles.paragraph}>
                    I will not modify the payment provider integration, touch any auth logic, or
                    change the database schema. If I encounter anything outside this scope I will
                    stop and flag it.
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
                      <Button variant="destructive" onClick={() => showToast("Plan rejected, agent will re-plan with your feedback.")}>
                        Reject &amp; re-plan
                      </Button>
                      <Button variant="primary" onClick={() => showToast("Plan approved. Execution starting…")}>
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
                <ConsoleLog lines={LOG_LINES} />
                <div className={styles.stepNote}>Step 8 of 10 · GitHub Actions · {repo}</div>
                <div className={styles.spentBox}>
                  <div className={styles.factRow}>
                    <span className={styles.factDot}>●</span>
                    <span className={styles.factLabel}>Spent so far</span>
                    <span className={styles.factValue}>${totalSpent.toFixed(2)}</span>
                  </div>
                  <div className={styles.factCaption}>plan + 7 completed steps · logged · updating live</div>
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
                  <div className={styles.emptyCard} style={{ marginBottom: 14, fontSize: 13 }}>
                    Agent branch: agent/{ticket.id.toLowerCase()} → main
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                    <span className={[styles.prStatPill, styles.prStatAdd].join(" ")}>+42 lines</span>
                    <span className={[styles.prStatPill, styles.prStatDel].join(" ")}>-18 lines</span>
                    <span className={[styles.prStatPill, styles.prStatNeutral].join(" ")}>3 files changed</span>
                  </div>
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
                    <Button variant="destructive" onClick={() => showToast("Requesting changes, starting a new plan/execute cycle.")}>
                      Request changes
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        showToast(`${ticket.id} merged.`);
                        setTimeout(() => router.push("/tickets"), 900);
                      }}
                    >
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
                  The agent tried this ticket {ticket.attempt_count} times and hit the retry cap
                  without a passing run. Last attempt failed: the test suite did not pass after the
                  final retry. No further automatic attempts will run.
                </div>
                <div className={styles.formActions} style={{ justifyContent: "flex-start" }}>
                  <Button variant="secondary" onClick={() => showToast("Reassigned, starting a fresh plan.")}>
                    Reassign to agent
                  </Button>
                  <Button variant="ghost" onClick={() => showToast("Opening ticket for manual edit…")}>
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
                    spent={{ value: `$${totalSpent.toFixed(3)}`, caption: "ticketization + plan generation, logged" }}
                    estimate={
                      runs.length > 0
                        ? { value: "$0.40–$1.20", evidence: "based on 6 past runs touching 3–5 files" }
                        : undefined
                    }
                  />
                </Card>
              </>
            )}

            {(ticket.state === "executing" || ticket.state === "agent_running") && (
              <>
                <div className={styles.sectionTitle}>Approved plan</div>
                <Card raised style={{ marginBottom: 24 }}>
                  <div className={styles.fileNote} style={{ textTransform: "uppercase", letterSpacing: ".02em", marginBottom: 8 }}>
                    Approved Mon Aug 28 10:51 AM
                  </div>
                  <div className={styles.paragraph} style={{ marginBottom: 8 }}>
                    {ticket.plan_summary}
                  </div>
                  <div className={styles.fileNote}>3 files · approved by you</div>
                </Card>
              </>
            )}

            {ticket.state === "review" && (
              <>
                <div className={styles.sectionTitle}>Run cost</div>
                <Card raised style={{ marginBottom: 24 }}>
                  <div className={styles.factRow}>
                    <span className={styles.factDot}>●</span>
                    <span className={styles.factLabel}>Total spent</span>
                    <span className={styles.factValue}>${totalSpent.toFixed(2)}</span>
                  </div>
                  <div className={styles.factCaption} style={{ marginBottom: 16 }}>
                    ticketization + plan + execution · logged · final
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className={styles.costRow}>
                      <span>Plan generation</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>$0.062</span>
                    </div>
                    <div className={styles.costRow}>
                      <span>Execution</span>
                      <span style={{ fontFamily: "var(--font-mono)" }}>$0.744</span>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {ticket.state === "needs_human" && (
              <>
                <div className={styles.sectionTitle}>Cost so far</div>
                <Card raised style={{ marginBottom: 24 }}>
                  <div className={styles.factRow}>
                    <span className={styles.factDot}>●</span>
                    <span className={styles.factLabel}>Total spent</span>
                    <span className={styles.factValue}>${totalSpent.toFixed(2)}</span>
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
                    <div className={[styles.historyText, styles.historyTextSignal].join(" ")}>Executing step 8 of 10</div>
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
