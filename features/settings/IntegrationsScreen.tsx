"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { mockRepos } from "@/mock/integrations";
import type { RepoRow } from "@/types/db";
import styles from "./IntegrationsScreen.module.css";

const POLICIES = [
  {
    key: "smart",
    title: "Smart auto-join",
    desc: "Send a bot automatically only for known clients. All other meetings surface as one-click suggestions.",
  },
  {
    key: "always",
    title: "Always suggest",
    desc: "Every detected meeting surfaces as a suggestion, no bots sent without your click.",
  },
] as const;

export function IntegrationsScreen() {
  const [repos, setRepos] = useState<RepoRow[]>(mockRepos);
  const [policy, setPolicy] = useState<"smart" | "always">("smart");
  const [githubConnected, setGithubConnected] = useState(true);
  const [calendarConnected, setCalendarConnected] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  function setDefaultRepo(id: string) {
    setRepos((rs) => rs.map((r) => ({ ...r, is_default: r.id === id })));
  }

  function removeRepo(id: string) {
    setRepos((rs) => rs.filter((r) => r.id !== id));
  }

  return (
    <div className={styles.body}>
      <div className={styles.sectionTitle}>Integrations</div>
      <div className={styles.lede}>
        Connect tools the agent and meeting bot use. All tokens are encrypted at rest.
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div className={styles.providerRow}>
          <svg className={styles.providerIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.5">
            <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 8v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 6.7 5.4 7 5.4 7a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 13.4c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className={styles.providerName}>GitHub</div>
          <div className={styles.spacer} />
          {githubConnected ? (
            <>
              <span className={styles.connectedPill}>● Connected</span>
              <span className={styles.accountLabel}>@jordan-freelance</span>
              <button
                className={styles.disconnectLink}
                onClick={() => {
                  setGithubConnected(false);
                  showToast("GitHub disconnected.");
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setGithubConnected(true)}>
              Connect GitHub
            </Button>
          )}
        </div>
        <div className={styles.subNote}>
          OAuth · PRs opened under your GitHub account · commits attributed to Agentic OS Agent
          &lt;agent@agentcos.dev&gt;
        </div>

        <div className={styles.divider} />

        <div className={styles.subSectionHead}>
          <div className={styles.subSectionTitle}>Connected repositories</div>
          <Button
            variant="primary"
            style={{ height: 36, padding: "0 14px", fontSize: 13 }}
            onClick={() => showToast("Opening GitHub repo picker…")}
          >
            Connect repo
          </Button>
        </div>

        {repos.length === 0 ? (
          <div className={styles.repoFootNote}>No repos connected yet. Connect one to let the agent open PRs.</div>
        ) : (
          <div className={styles.repoTable}>
            <div className={styles.repoHeadRow}>
              <span>Repository</span>
              <span>Default branch</span>
              <span>Default</span>
              <span>Connected</span>
              <span />
            </div>
            {repos.map((r) => (
              <div key={r.id} className={styles.repoRow}>
                <span className={styles.repoName}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.6">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
                  </svg>
                  <span className={styles.repoNameText}>{r.full_name}</span>
                </span>
                <span className={styles.repoBranch}>main</span>
                <Toggle checked={r.is_default} onChange={() => setDefaultRepo(r.id)} label="Default" />
                <span className={styles.repoDate}>Sun Aug 2</span>
                <button className={styles.repoRemove} onClick={() => removeRepo(r.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div className={styles.repoFootNote}>
          The default repo is pre-selected when tickets are created. Override per ticket any time.
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div className={styles.providerRow}>
          <svg className={styles.providerIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--ink-2)" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
          </svg>
          <div className={styles.providerName}>Google Calendar</div>
          <div className={styles.spacer} />
          {calendarConnected ? (
            <>
              <span className={styles.connectedPill}>● Connected</span>
              <span className={styles.accountLabel}>jordan@gmail.com</span>
              <button
                className={styles.disconnectLink}
                onClick={() => {
                  setCalendarConnected(false);
                  showToast("Google Calendar disconnected.");
                }}
              >
                Disconnect
              </button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setCalendarConnected(true)}>
              Connect Google Calendar
            </Button>
          )}
        </div>
        <div className={styles.subNote}>
          Recall.ai Calendar Integration · reads upcoming events with video links · no per-event
          cost beyond bot usage
        </div>

        <div className={styles.divider} />

        <div className={styles.subSectionTitle} style={{ marginBottom: 12 }}>
          Auto-join policy
        </div>
        <div className={styles.policyList}>
          {POLICIES.map((p) => {
            const selected = policy === p.key;
            return (
              <div key={p.key} className={styles.policyOption} onClick={() => setPolicy(p.key)}>
                {selected && <div className={styles.policyBar} />}
                <span className={[styles.radio, selected && styles.radioSelected].filter(Boolean).join(" ")} />
                <div>
                  <div className={styles.policyTitle}>{p.title}</div>
                  <div className={styles.policyDesc}>{p.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className={styles.comingSoon}>
        <div className={styles.comingSoonText}>More integrations coming soon: GitLab, Bitbucket</div>
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
