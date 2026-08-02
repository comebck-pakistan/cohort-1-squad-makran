import { useEffect, useState } from "react";

import "~styles/tokens.css";
import "~styles/fonts.css";

import { PopupShell, type TabId } from "~components/PopupShell";
import { ClientScreen } from "~screens/ClientScreen";
import { ProposalScreen } from "~screens/ProposalScreen";
import { InsightsScreen } from "~screens/InsightsScreen";
import { SignedOutScreen } from "~screens/SignedOutScreen";
import { LoadingScreen } from "~screens/LoadingScreen";
import { NotOnJobScreen } from "~screens/NotOnJobScreen";
import { CLIENT_SCENARIOS, type ClientScenario } from "~mock/client";
import { PROPOSAL_SCENARIOS } from "~mock/proposal";
import { scrapeUpworkJobPage, isUpworkJobPage } from "~lib/scrape";
import { analyzeClient, getStoredToken, setStoredToken, ExtensionAuthError } from "~lib/api";
import { toClientScenario } from "~lib/adapt";
import styles from "~styles/popup.module.css";

type UtilityState = "signed-out" | "loading" | "not-on-job" | "ready";
type ClientVariant = "full" | "low" | "insufficient";
type ProposalVariant = "inVoice" | "surveyFallback";
type ScenarioMode = UtilityState | "auto";

/**
 * The M8 "MOCK SCENARIO" switcher stays as-is for demoing every state on command; "Auto (real)"
 * is new for M9, it drives everything below from the real signed-in token + the active tab's
 * actual Upwork page instead of a manually picked variant.
 */
function DevScenarioSwitcher(props: {
  mode: ScenarioMode;
  onMode: (s: ScenarioMode) => void;
  clientVariant: ClientVariant;
  onClientVariant: (v: ClientVariant) => void;
  proposalVariant: ProposalVariant;
  onProposalVariant: (v: ProposalVariant) => void;
}) {
  return (
    <div className={styles.devSwitcher}>
      <span>MOCK SCENARIO:</span>
      <select value={props.mode} onChange={(e) => props.onMode(e.target.value as ScenarioMode)}>
        <option value="auto">Auto (real)</option>
        <option value="ready">Ready</option>
        <option value="signed-out">Signed out</option>
        <option value="loading">Loading</option>
        <option value="not-on-job">Not on job page</option>
      </select>
      <select
        value={props.clientVariant}
        onChange={(e) => props.onClientVariant(e.target.value as ClientVariant)}
        disabled={props.mode === "auto"}
      >
        <option value="full">Client: full</option>
        <option value="low">Client: low</option>
        <option value="insufficient">Client: insufficient</option>
      </select>
      <select
        value={props.proposalVariant}
        onChange={(e) => props.onProposalVariant(e.target.value as ProposalVariant)}
      >
        <option value="inVoice">Proposal: in-voice</option>
        <option value="surveyFallback">Proposal: survey fallback</option>
      </select>
    </div>
  );
}

type AutoStatus =
  | { kind: "checking" }
  | { kind: "signed-out" }
  | { kind: "not-on-job" }
  | { kind: "loading" }
  | { kind: "ready"; scenario: ClientScenario }
  | { kind: "error"; message: string };

/** Real M9 path: token from chrome.storage, active tab's actual URL, live scrape + analysis. */
function AutoRealPopup({ tab, onTabChange }: { tab: TabId; onTabChange: (t: TabId) => void }) {
  const [status, setStatus] = useState<AutoStatus>({ kind: "checking" });

  async function run() {
    const token = await getStoredToken();
    if (!token) {
      setStatus({ kind: "signed-out" });
      return;
    }

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab?.url || !isUpworkJobPage(activeTab.url) || !activeTab.id) {
      setStatus({ kind: "not-on-job" });
      return;
    }

    setStatus({ kind: "loading" });
    try {
      const [{ result: scraped }] = await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: scrapeUpworkJobPage,
      });
      if (!scraped) throw new Error("Could not read this page.");
      const response = await analyzeClient(scraped);
      setStatus({ kind: "ready", scenario: toClientScenario(scraped, response) });
    } catch (err) {
      if (err instanceof ExtensionAuthError) {
        setStatus({ kind: "signed-out" });
        return;
      }
      setStatus({ kind: "error", message: err instanceof Error ? err.message : "Analysis failed." });
    }
  }

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmitToken(token: string) {
    await setStoredToken(token);
    await run();
  }

  if (status.kind === "checking" || status.kind === "loading") {
    return (
      <PopupShell jobTitle="—" activeTab={null} onTabChange={() => {}}>
        <LoadingScreen />
      </PopupShell>
    );
  }
  if (status.kind === "signed-out") {
    return (
      <PopupShell jobTitle="—" activeTab={null} onTabChange={() => {}}>
        <SignedOutScreen onSubmitToken={handleSubmitToken} />
      </PopupShell>
    );
  }
  if (status.kind === "not-on-job") {
    return (
      <PopupShell jobTitle="—" activeTab={null} onTabChange={() => {}}>
        <NotOnJobScreen />
      </PopupShell>
    );
  }
  if (status.kind === "error") {
    return (
      <PopupShell jobTitle="—" activeTab={null} onTabChange={() => {}}>
        <div className={styles.utilityBody}>
          <div className={styles.utilityTitle}>Couldn&apos;t analyze this page</div>
          <p>{status.message}</p>
        </div>
      </PopupShell>
    );
  }

  return (
    <PopupShell jobTitle={status.scenario.jobTitle} cacheLabel={status.scenario.cachedLabel} activeTab={tab} onTabChange={onTabChange}>
      {tab === "client" && <ClientScreen scenario={status.scenario} />}
      {tab === "proposal" && <ProposalScreen scenario={PROPOSAL_SCENARIOS.inVoice} dashed={false} />}
      {tab === "insights" && <InsightsScreen />}
    </PopupShell>
  );
}

function IndexPopup() {
  const [mode, setMode] = useState<ScenarioMode>("auto");
  const [tab, setTab] = useState<TabId>("client");
  const [clientVariant, setClientVariant] = useState<ClientVariant>("full");
  const [proposalVariant, setProposalVariant] = useState<ProposalVariant>("inVoice");

  const clientScenario = CLIENT_SCENARIOS[clientVariant];
  const proposalScenario = PROPOSAL_SCENARIOS[proposalVariant];

  return (
    <div style={{ background: "var(--base)", padding: "20px 0" }}>
      <DevScenarioSwitcher
        mode={mode}
        onMode={setMode}
        clientVariant={clientVariant}
        onClientVariant={setClientVariant}
        proposalVariant={proposalVariant}
        onProposalVariant={setProposalVariant}
      />
      <div style={{ padding: "12px 0 0" }}>
        {mode === "auto" && <AutoRealPopup tab={tab} onTabChange={setTab} />}
        {mode === "signed-out" && (
          <PopupShell jobTitle="—" activeTab={null} onTabChange={() => {}}>
            <SignedOutScreen />
          </PopupShell>
        )}
        {mode === "not-on-job" && (
          <PopupShell jobTitle="—" activeTab={null} onTabChange={() => {}}>
            <NotOnJobScreen />
          </PopupShell>
        )}
        {mode === "loading" && (
          <PopupShell jobTitle={clientScenario.jobTitle} cacheLabel={clientScenario.cachedLabel} activeTab="client" onTabChange={() => {}}>
            <LoadingScreen />
          </PopupShell>
        )}
        {mode === "ready" && (
          <PopupShell
            jobTitle={tab === "proposal" ? proposalScenario.jobTitle : clientScenario.jobTitle}
            cacheLabel={tab === "proposal" ? proposalScenario.cachedLabel : clientScenario.cachedLabel}
            activeTab={tab}
            onTabChange={setTab}
          >
            {tab === "client" && <ClientScreen scenario={clientScenario} />}
            {tab === "proposal" && <ProposalScreen scenario={proposalScenario} dashed={proposalVariant === "surveyFallback"} />}
            {tab === "insights" && <InsightsScreen />}
          </PopupShell>
        )}
      </div>
    </div>
  );
}

export default IndexPopup;
