"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import styles from "./ConnectIntegrationsScreen.module.css";

const REPOS = ["acme-corp / storefront", "acme-corp / api-service", "acme-corp / marketing-site"];

export function ConnectIntegrationsScreen() {
  const router = useRouter();
  const [selectedRepo, setSelectedRepo] = useState(REPOS[0]);
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--base)" }}>
      <OnboardingHeader current={2} />
      <div className={styles.page}>
        <h1 className={styles.h1}>Connect your tools</h1>
        <p className={styles.lede}>
          Connect GitHub so the agent can open PRs, and Google Calendar so meetings are detected
          automatically. You can connect either one later in Settings.
        </p>

        <div className={styles.list}>
          <Card>
            <div className={styles.row}>
              <div className={styles.rowMain}>
                <svg className={styles.icon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.5">
                  <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 8v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 6.7 5.4 7 5.4 7a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 13.4c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <div className={styles.title}>GitHub</div>
                  <div className={styles.desc}>
                    The agent opens PRs under your account. Commits are attributed to Agentic OS Agent.
                  </div>
                  <div className={styles.subnote}>Uses OAuth, PRs appear under your GitHub account.</div>
                </div>
              </div>
              <div className={styles.status}>
                <div className={styles.connectedPill}>● Connected</div>
                <div className={styles.accountLabel}>@jordan-freelance</div>
              </div>
            </div>

            <div className={styles.repoSection}>
              <div className={styles.repoLabel}>Default repository</div>
              <div className={styles.repoSelectWrap}>
                <button className={styles.repoSelect} onClick={() => setRepoDropdownOpen((v) => !v)}>
                  <span className={styles.repoSelectValue}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.5">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
                    </svg>
                    <span className={styles.repoSelectText}>{selectedRepo}</span>
                  </span>
                  <span className={styles.repoCaret}>▾</span>
                </button>
                {repoDropdownOpen && (
                  <div className={styles.repoDropdown}>
                    {REPOS.map((repo) => (
                      <button
                        key={repo}
                        className={styles.repoOption}
                        onClick={() => {
                          setSelectedRepo(repo);
                          setRepoDropdownOpen(false);
                        }}
                      >
                        {repo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.repoNote}>The agent uses this repo unless you override it per ticket.</div>
              <button className={styles.repoAddLink} onClick={() => showToast("Opening GitHub repo picker…")}>
                + Connect another repo
              </button>
            </div>
          </Card>

          <div className={styles.divider}>
            Both integrations can be skipped and added later in Settings → Integrations.
          </div>

          <Card>
            <div className={styles.row} style={{ alignItems: "center" }}>
              <div className={styles.rowMain}>
                <svg className={styles.icon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.5">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M3 9h18M8 2v4M16 2v4M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeLinecap="round" />
                </svg>
                <div>
                  <div className={styles.title}>Google Calendar</div>
                  <div className={styles.desc} style={{ marginBottom: 0 }}>
                    Upcoming meetings with video links are detected automatically. Known clients
                    auto-join; others need one click to confirm.
                  </div>
                </div>
              </div>
              {calendarConnected ? (
                <div className={styles.connectedPill} style={{ flexShrink: 0 }}>
                  ● Connected
                </div>
              ) : (
                <div style={{ flexShrink: 0 }}>
                  <Button
                    variant="primary"
                    onClick={() => {
                      setCalendarConnected(true);
                      showToast("Google Calendar connected.");
                    }}
                  >
                    Connect Google Calendar
                  </Button>
                </div>
              )}
            </div>
            <div className={styles.calendarNote}>
              Meetings with unknown contacts surface as suggestions, never auto-joined without a
              known client match.
            </div>
          </Card>
        </div>

        <div className={styles.footer}>
          <Button
            variant="secondary"
            onClick={() => {
              showToast("Returning to Voice…");
              router.push("/onboarding/voice");
            }}
          >
            Back
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              showToast("Setup complete. Opening your workspace…");
              router.push("/home");
            }}
          >
            Finish setup
          </Button>
        </div>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
