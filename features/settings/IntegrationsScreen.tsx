"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Calendar, Puzzle } from "lucide-react";
import { GithubMark } from "@/components/icons/GithubMark";
import { connectRepo, removeRepo, setDefaultRepo, disconnectGithub } from "@/lib/actions/repos";
import { disconnectGoogleCalendar } from "@/lib/actions/calendar";
import { generateExtensionToken } from "@/lib/actions/extension-tokens";
import type { RepoRow, IntegrationRow } from "@/types/db";
import styles from "./IntegrationsScreen.module.css";

interface IntegrationsScreenProps {
  initialIntegrations: IntegrationRow[];
  initialRepos: RepoRow[];
  initialExtensionConnected: boolean;
  initialRepoOptions: string[];
}

export function IntegrationsScreen({
  initialIntegrations,
  initialRepos,
  initialExtensionConnected,
  initialRepoOptions,
}: IntegrationsScreenProps) {
  const router = useRouter();
  const [repos, setRepos] = useState<RepoRow[]>(initialRepos);
  const [repoOptions] = useState<string[]>(initialRepoOptions);
  const githubIntegration = initialIntegrations.find((i) => i.category === "repo" && i.provider === "github");
  const [githubConnected, setGithubConnected] = useState(githubIntegration?.status === "connected");
  const [newRepo, setNewRepo] = useState("");
  const [connecting, setConnecting] = useState(false);
  const availableRepoOptions = repoOptions.filter((name) => !repos.some((r) => r.full_name === name));
  const [toast, setToast] = useState<string | null>(null);
  const calendarIntegration = initialIntegrations.find(
    (i) => i.category === "calendar" && i.provider === "google_calendar"
  );
  const [calendarConnected, setCalendarConnected] = useState(calendarIntegration?.status === "connected");
  const [calendarAccountLabel, setCalendarAccountLabel] = useState(calendarIntegration?.account_label ?? null);
  const [disconnectingCalendar, setDisconnectingCalendar] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(initialExtensionConnected);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  async function handleGenerateToken() {
    setGeneratingToken(true);
    try {
      const token = await generateExtensionToken();
      setNewToken(token);
      setExtensionConnected(true);
    } catch {
      showToast("Could not generate a token. Try again.");
    } finally {
      setGeneratingToken(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");
    if (connected === "github") showToast("GitHub connected.");
    if (connected === "google_calendar") {
      showToast("Google Calendar connected.");
      setCalendarConnected(true);
    }
    if (error) showToast(`Connect failed: ${error.replace(/_/g, " ")}`);
    if (connected || error) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  async function handleDisconnectCalendar() {
    setDisconnectingCalendar(true);
    try {
      await disconnectGoogleCalendar();
      setCalendarConnected(false);
      setCalendarAccountLabel(null);
      showToast("Google Calendar disconnected.");
    } finally {
      setDisconnectingCalendar(false);
    }
  }

  async function handleConnectRepo() {
    const fullName = newRepo.trim();
    if (!fullName) return;
    setConnecting(true);
    try {
      const repo = await connectRepo(fullName);
      setRepos((rs) => [...rs, repo]);
      setGithubConnected(true);
      setNewRepo("");
      showToast(`Connected ${fullName}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not connect that repo.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleSetDefaultRepo(id: string) {
    setRepos((rs) => rs.map((r) => ({ ...r, is_default: r.id === id })));
    await setDefaultRepo(id);
  }

  async function handleRemoveRepo(id: string) {
    setRepos((rs) => rs.filter((r) => r.id !== id));
    await removeRepo(id);
  }

  async function handleDisconnectGithub() {
    setGithubConnected(false);
    setRepos([]);
    await disconnectGithub();
    showToast("GitHub disconnected.");
    router.refresh();
  }

  return (
    <div className={styles.body}>
      <div className={styles.sectionTitle}>Integrations</div>
      <div className={styles.lede}>
        Connect tools the agent and meeting bot use. All tokens are encrypted at rest.
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div className={styles.providerRow}>
          <GithubMark className={styles.providerIcon} width={20} height={20} color="var(--ink-2)" />
          <div className={styles.providerName}>GitHub</div>
          <div className={styles.spacer} />
          {githubConnected ? (
            <>
              <span className={styles.connectedPill}>● Connected</span>
              {githubIntegration?.account_label && (
                <span className={styles.accountLabel}>@{githubIntegration.account_label}</span>
              )}
              <button className={styles.disconnectLink} onClick={handleDisconnectGithub}>
                Disconnect
              </button>
            </>
          ) : (
            <a href="/api/github/oauth/start">
              <Button variant="primary" style={{ height: 32, padding: "0 14px", fontSize: 13 }}>
                Connect with GitHub
              </Button>
            </a>
          )}
        </div>
        <div className={styles.subNote}>
          OAuth (scopes: repo, workflow) · PRs opened under your GitHub account · commits
          attributed to Solvo Agent &lt;agent@solvo.dev&gt;
        </div>

        <div className={styles.divider} />

        <div className={styles.subSectionHead}>
          <div className={styles.subSectionTitle}>Connected repositories</div>
          {githubConnected && (
            <div style={{ display: "flex", gap: 8 }}>
              <Select
                placeholder={availableRepoOptions.length === 0 ? "No repos found" : "Select a repo"}
                value={newRepo}
                onChange={(e) => setNewRepo(e.target.value)}
                options={availableRepoOptions.map((name) => ({ value: name, label: name }))}
                disabled={availableRepoOptions.length === 0}
                style={{ height: 36, width: 240, fontSize: 13 }}
              />
              <Button
                variant="primary"
                style={{ height: 36, padding: "0 14px", fontSize: 13 }}
                onClick={handleConnectRepo}
                disabled={connecting || !newRepo}
              >
                {connecting ? "Connecting…" : "Connect repo"}
              </Button>
            </div>
          )}
        </div>

        {!githubConnected ? (
          <div className={styles.repoFootNote}>Connect GitHub above before adding a repo.</div>
        ) : repos.length === 0 ? (
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
                  <GithubMark width={14} height={14} color="var(--ink-3)" />
                  <span className={styles.repoNameText}>{r.full_name}</span>
                </span>
                <span className={styles.repoBranch}>default</span>
                <Toggle checked={r.is_default} onChange={() => handleSetDefaultRepo(r.id)} label="Default" />
                <span className={styles.repoDate}>–</span>
                <button className={styles.repoRemove} onClick={() => handleRemoveRepo(r.id)}>
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
          <Calendar className={styles.providerIcon} width={20} height={20} color="var(--ink-2)" strokeWidth={1.5} />
          <div className={styles.providerName}>Google Calendar</div>
          <div className={styles.spacer} />
          {calendarConnected ? (
            <>
              <span className={styles.connectedPill}>● Connected</span>
              {calendarAccountLabel && <span className={styles.accountLabel}>{calendarAccountLabel}</span>}
              <button className={styles.disconnectLink} onClick={handleDisconnectCalendar} disabled={disconnectingCalendar}>
                {disconnectingCalendar ? "Disconnecting…" : "Disconnect"}
              </button>
            </>
          ) : (
            <a href="/api/google-calendar/oauth/start">
              <Button variant="primary" style={{ height: 32, padding: "0 14px", fontSize: 13 }}>
                Connect with Google Calendar
              </Button>
            </a>
          )}
        </div>
        <div className={styles.subNote}>
          OAuth (scope: calendar.readonly) · events with a video link and a known-client attendee
          get a bot sent automatically, everything else surfaces as a suggestion on Meetings
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div className={styles.providerRow}>
          <Puzzle className={styles.providerIcon} width={20} height={20} color="var(--ink-2)" strokeWidth={1.5} />
          <div className={styles.providerName}>Browser extension</div>
          <div className={styles.spacer} />
          {extensionConnected ? (
            <span className={styles.connectedPill}>● Connected</span>
          ) : (
            <span className={styles.accountLabel}>Not connected yet.</span>
          )}
        </div>
        <div className={styles.subNote}>
          Bearer token, paste it into the extension&rsquo;s sign-in screen · same trust level as the
          GitHub token above · generating a new one replaces the old (old copies stop working)
        </div>

        <div className={styles.divider} />

        {newToken ? (
          <div>
            <div className={styles.subSectionTitle} style={{ marginBottom: 8 }}>
              Your token (shown once, copy it now)
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Input readOnly value={newToken} style={{ height: 36, flex: 1, fontFamily: "var(--font-mono)", fontSize: 12 }} />
              <Button
                variant="secondary"
                style={{ height: 36, padding: "0 14px", fontSize: 13 }}
                onClick={() => {
                  navigator.clipboard.writeText(newToken);
                  showToast("Copied to clipboard.");
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant={extensionConnected ? "secondary" : "primary"}
            style={{ height: 36, padding: "0 14px", fontSize: 13 }}
            onClick={handleGenerateToken}
            disabled={generatingToken}
          >
            {generatingToken ? "Generating…" : extensionConnected ? "Generate new token" : "Generate token"}
          </Button>
        )}
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
