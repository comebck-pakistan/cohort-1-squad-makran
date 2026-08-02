import { useState } from "react";

import "~styles/tokens.css";
import "~styles/fonts.css";

import { PopupShell, type TabId } from "~components/PopupShell";
import { ClientScreen } from "~screens/ClientScreen";
import { ProposalScreen } from "~screens/ProposalScreen";
import { InsightsScreen } from "~screens/InsightsScreen";
import { SignedOutScreen } from "~screens/SignedOutScreen";
import { LoadingScreen } from "~screens/LoadingScreen";
import { NotOnJobScreen } from "~screens/NotOnJobScreen";
import { CLIENT_SCENARIOS } from "~mock/client";
import { PROPOSAL_SCENARIOS } from "~mock/proposal";
import styles from "~styles/popup.module.css";

type UtilityState = "signed-out" | "loading" | "not-on-job" | "ready";
type ClientVariant = "full" | "low" | "insufficient";
type ProposalVariant = "inVoice" | "surveyFallback";

/**
 * M8 scope is mock data only, no real Upwork scraping / auth / LLM calls yet (M9).
 * This switcher exists purely so every state is reachable for review, same reason
 * M1's mock web screens shipped an explicit variant per state instead of one guess.
 */
function DevScenarioSwitcher(props: {
  state: UtilityState;
  onState: (s: UtilityState) => void;
  clientVariant: ClientVariant;
  onClientVariant: (v: ClientVariant) => void;
  proposalVariant: ProposalVariant;
  onProposalVariant: (v: ProposalVariant) => void;
}) {
  return (
    <div className={styles.devSwitcher}>
      <span>MOCK SCENARIO:</span>
      <select value={props.state} onChange={(e) => props.onState(e.target.value as UtilityState)}>
        <option value="ready">Ready</option>
        <option value="signed-out">Signed out</option>
        <option value="loading">Loading</option>
        <option value="not-on-job">Not on job page</option>
      </select>
      <select value={props.clientVariant} onChange={(e) => props.onClientVariant(e.target.value as ClientVariant)}>
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

function IndexPopup() {
  const [state, setState] = useState<UtilityState>("ready");
  const [tab, setTab] = useState<TabId>("client");
  const [clientVariant, setClientVariant] = useState<ClientVariant>("full");
  const [proposalVariant, setProposalVariant] = useState<ProposalVariant>("inVoice");

  const clientScenario = CLIENT_SCENARIOS[clientVariant];
  const proposalScenario = PROPOSAL_SCENARIOS[proposalVariant];

  return (
    <div style={{ background: "var(--base)", padding: "20px 0" }}>
      <DevScenarioSwitcher
        state={state}
        onState={setState}
        clientVariant={clientVariant}
        onClientVariant={setClientVariant}
        proposalVariant={proposalVariant}
        onProposalVariant={setProposalVariant}
      />
      <div style={{ padding: "12px 0 0" }}>
        {state === "signed-out" && (
          <PopupShell jobTitle="—" activeTab={null} onTabChange={() => {}}>
            <SignedOutScreen />
          </PopupShell>
        )}
        {state === "not-on-job" && (
          <PopupShell jobTitle="—" activeTab={null} onTabChange={() => {}}>
            <NotOnJobScreen />
          </PopupShell>
        )}
        {state === "loading" && (
          <PopupShell jobTitle={clientScenario.jobTitle} cacheLabel={clientScenario.cachedLabel} activeTab="client" onTabChange={() => {}}>
            <LoadingScreen />
          </PopupShell>
        )}
        {state === "ready" && (
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
