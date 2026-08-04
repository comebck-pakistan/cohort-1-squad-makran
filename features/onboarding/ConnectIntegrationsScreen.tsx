"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import { Calendar } from "lucide-react";
import { GithubMark } from "@/components/icons/GithubMark";
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
                <GithubMark className={styles.icon} width={24} height={24} color="var(--ink-2)" />
                <div>
                  <div className={styles.title}>GitHub</div>
                  <div className={styles.desc}>
                    The agent opens PRs under your account. Commits are attributed to Solvo Agent.
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
                    <GithubMark width={16} height={16} color="var(--ink-3)" />
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
                <Calendar className={styles.icon} width={24} height={24} color="var(--ink-2)" strokeWidth={1.5} />
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
