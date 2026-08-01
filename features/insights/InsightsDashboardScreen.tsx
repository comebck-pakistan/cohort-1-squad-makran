"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { StateChip } from "@/components/state/StateChip";
import { mockProposals } from "@/mock/proposals";
import styles from "./InsightsDashboardScreen.module.css";

const RESOLVED_THRESHOLD = 10;

const EXAMPLE_WON = [
  { label: "Selected on merit", count: 6, pct: 67 },
  { label: "Referred / relationship", count: 2, pct: 22 },
  { label: "Price matched budget", count: 1, pct: 11 },
];
const EXAMPLE_LOST = [
  { label: "Went with someone else", count: 5, pct: 45 },
  { label: "No response", count: 3, pct: 27 },
  { label: "Price too high", count: 2, pct: 18 },
  { label: "Scope mismatch", count: 1, pct: 9 },
];
const EXAMPLE_OUTCOMES = [
  { proposal: "Shopify checkout rebuild", state: "won" as const, reason: "Selected on merit" },
  { proposal: "API integration project", state: "won" as const, reason: "Referred / relationship" },
  { proposal: "Mobile app redesign", state: "lost" as const, reason: "Went with someone else" },
  { proposal: "Dashboard analytics", state: "won" as const, reason: "Selected on merit" },
  { proposal: "React Native migration", state: "lost" as const, reason: "Price too high" },
  { proposal: "CMS integration", state: "lost" as const, reason: "No response" },
  { proposal: "Auth refactor", state: "won" as const, reason: "Selected on merit" },
];

export function InsightsDashboardScreen() {
  const [exampleData, setExampleData] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  const sent = mockProposals.filter((p) => p.state !== "draft");
  const resolved = mockProposals.filter((p) => p.state === "won" || p.state === "lost");
  const won = mockProposals.filter((p) => p.state === "won");
  const pending = mockProposals.filter((p) => p.state === "sent");
  const winRate = resolved.length > 0 ? Math.round((won.length / resolved.length) * 100) : null;

  const statColor = exampleData ? "var(--ink-3)" : "var(--ink)";
  const verifiedColor = exampleData ? "var(--ink-3)" : "var(--verified)";
  const predictColor = exampleData ? "var(--ink-3)" : "var(--predict)";

  const hint = exampleData
    ? "Real data will replace this automatically once you resolve 10 proposals."
    : `Example data auto-hides after ${RESOLVED_THRESHOLD} resolved proposals · you have ${resolved.length} resolved, ${RESOLVED_THRESHOLD - resolved.length} more to go.`;

  return (
    <div>
      <div className={styles.headRow}>
        <div className={styles.title}>Insights</div>
        <Toggle
          checked={exampleData}
          onChange={(v) => {
            setExampleData(v);
            showToast(v ? "Showing example data." : "Example data off. Showing your real data.");
          }}
          label="Example data"
        />
      </div>
      <div className={styles.hintRow}>
        <span className={styles.hint}>{hint}</span>
      </div>

      {exampleData && (
        <div className={styles.bannerWrap}>
          <div className={styles.banner}>
            <div className={styles.bannerBar} />
            <span className={styles.bannerText}>
              You&rsquo;re viewing example data. No real proposals have been resolved yet. Resolve{" "}
              {RESOLVED_THRESHOLD} proposals to unlock your real insights.
            </span>
          </div>
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.statGrid}>
          <Card>
            <div className={styles.statEyebrow}>Proposals sent</div>
            <div className={styles.statValue} style={{ color: statColor }}>
              {exampleData ? 24 : sent.length}
            </div>
            <div className={styles.statSub}>last 90 days</div>
            {exampleData && <div className={styles.statExample}>EXAMPLE</div>}
          </Card>
          <Card>
            <div className={styles.statEyebrow}>Win rate</div>
            <div className={styles.statValue} style={{ color: verifiedColor }}>
              {exampleData ? "38%" : winRate !== null ? `${winRate}%` : "–"}
            </div>
            <div className={styles.statSub}>
              {exampleData ? "9 won of 24 resolved" : `${won.length} won of ${resolved.length} resolved`}
            </div>
            {exampleData && <div className={styles.statExample}>EXAMPLE</div>}
          </Card>
          <Card>
            <div className={styles.statEyebrow}>Avg time to close</div>
            <div className={styles.statValue} style={{ color: statColor }}>
              {exampleData ? "4.2d" : resolved.length >= 3 ? "–" : "–"}
            </div>
            <div className={styles.statSub}>
              {exampleData ? "sent → won/lost" : "not enough history yet: no estimate shown"}
            </div>
            {exampleData && <div className={styles.statExample}>EXAMPLE</div>}
          </Card>
          <Card>
            <div className={styles.statEyebrow}>Pending</div>
            <div className={styles.statValue} style={{ color: predictColor }}>
              {exampleData ? 6 : pending.length}
            </div>
            <div className={styles.statSub}>awaiting response</div>
            {exampleData && <div className={styles.statExample}>EXAMPLE</div>}
          </Card>
        </div>

        <div className={styles.twoCol}>
          <div>
            <div className={styles.sectionTitle}>Why proposals close</div>
            <div className={styles.hatchWrap}>
              {exampleData && (
                <>
                  <div className={styles.hatchOverlay} />
                  <div className={styles.hatchPill}>EXAMPLE DATA</div>
                </>
              )}
              <Card raised>
                {exampleData ? (
                  <>
                    <div className={[styles.reasonGroupLabel, styles.reasonGroupWon].join(" ")}>Won</div>
                    <div className={styles.reasonList}>
                      {EXAMPLE_WON.map((r) => (
                        <div key={r.label} className={styles.reasonRow}>
                          <span className={styles.reasonLabel}>{r.label}</span>
                          <div className={styles.reasonTrack}>
                            <div className={styles.reasonFillWon} style={{ width: `${r.pct}%` }} />
                          </div>
                          <span className={styles.reasonCount}>
                            {r.count} · {r.pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className={styles.reasonDivider} />
                    <div className={[styles.reasonGroupLabel, styles.reasonGroupLost].join(" ")}>Lost</div>
                    <div className={styles.reasonList} style={{ marginBottom: 0 }}>
                      {EXAMPLE_LOST.map((r) => (
                        <div key={r.label} className={styles.reasonRow}>
                          <span className={styles.reasonLabel}>{r.label}</span>
                          <div className={styles.reasonTrack}>
                            <div className={styles.reasonFillLost} style={{ width: `${r.pct}%` }} />
                          </div>
                          <span className={styles.reasonCount}>
                            {r.count} · {r.pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className={styles.emptyNote}>
                    Not enough resolved proposals yet for a reason breakdown. Capture an outcome on
                    a won or lost proposal to start building this out.
                  </div>
                )}
              </Card>
            </div>
          </div>

          <div>
            <div className={styles.sectionTitle}>Recent outcomes</div>
            <div className={styles.hatchWrap}>
              {exampleData && (
                <>
                  <div className={styles.hatchOverlay} />
                  <div className={styles.hatchPill}>EXAMPLE DATA</div>
                </>
              )}
              <Card raised>
                {exampleData ? (
                  EXAMPLE_OUTCOMES.map((o, i) => (
                    <div key={i} className={styles.outcomeRow}>
                      <span className={styles.outcomeTitle}>{o.proposal}</span>
                      <div className={styles.outcomeMeta}>
                        <StateChip state={o.state} />
                        <span className={styles.outcomeReason}>{o.reason}</span>
                      </div>
                    </div>
                  ))
                ) : resolved.length === 0 ? (
                  <div className={styles.emptyNote}>
                    No resolved proposals yet. Turn on example data to preview the dashboard.
                  </div>
                ) : (
                  resolved.map((p) => (
                    <div key={p.id} className={styles.outcomeRow}>
                      <span className={styles.outcomeTitle}>{p.title}</span>
                      <div className={styles.outcomeMeta}>
                        <StateChip state={p.state} />
                        <span className={styles.outcomeReason}>{p.outcome_reason}</span>
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </div>
          </div>
        </div>

        <div>
          <div className={styles.sectionTitle}>Win rate over time</div>
          <div className={styles.hatchWrap}>
            {exampleData && (
              <>
                <div className={styles.hatchOverlay} />
                <div className={styles.hatchPill}>EXAMPLE DATA</div>
              </>
            )}
            <Card raised>
              {exampleData ? (
                <>
                  <svg viewBox="0 0 760 220" width="100%" height="220" preserveAspectRatio="none">
                    <line x1="0" y1="10" x2="760" y2="10" stroke="var(--border)" strokeWidth="1" />
                    <line x1="0" y1="70" x2="760" y2="70" stroke="var(--border)" strokeWidth="1" />
                    <line x1="0" y1="130" x2="760" y2="130" stroke="var(--border)" strokeWidth="1" />
                    <line x1="0" y1="190" x2="760" y2="190" stroke="var(--border)" strokeWidth="1" />
                    <polygon points="0,157.5 190,142 380,134.9 570,113.8 760,124.4 760,190 0,190" fill="var(--signal-tint)" />
                    <polyline points="0,157.5 190,142 380,134.9 570,113.8 760,124.4" fill="none" stroke="var(--signal)" strokeWidth="2.5" />
                    {[
                      [0, 157.5],
                      [190, 142],
                      [380, 134.9],
                      [570, 113.8],
                      [760, 124.4],
                    ].map(([cx, cy], i) => (
                      <circle key={i} cx={cx} cy={cy} r="4" fill="var(--signal)" />
                    ))}
                  </svg>
                  <div className={styles.chartAxis}>
                    {["Mar · 25%", "Apr · 30%", "May · 33%", "Jun · 42%", "Aug · 38%"].map((l) => (
                      <span key={l} className={styles.chartAxisLabel}>
                        {l}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className={styles.emptyNote}>
                  Not enough resolved proposals yet to chart a trend: no estimate shown.
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
