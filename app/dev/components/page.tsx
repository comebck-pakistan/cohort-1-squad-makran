"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { EpistemicValue } from "@/components/epistemic/EpistemicValue";
import { ConfidenceTag, ConfidenceTier } from "@/components/epistemic/ConfidenceTag";
import { PriceBand } from "@/components/epistemic/PriceBand";
import { CostEstimateModule } from "@/components/epistemic/CostEstimateModule";
import { StateChip } from "@/components/state/StateChip";
import { VerdictBadge, Verdict } from "@/components/state/VerdictBadge";
import { HumanGateBar } from "@/components/state/HumanGateBar";
import { ConsoleLog } from "@/components/console/ConsoleLog";
import { ConsoleButton } from "@/components/console/ConsoleButton";
import { NotificationCard, NotificationType } from "@/components/feedback/NotificationCard";
import type { TicketState, ProposalState } from "@/components/state/types";

const TICKET_STATES: TicketState[] = [
  "backlog",
  "in_progress",
  "agent_running",
  "awaiting_plan_approval",
  "executing",
  "review",
  "changes_requested",
  "needs_human",
  "done",
];

const PROPOSAL_STATES: ProposalState[] = ["draft", "sent", "won", "lost"];
const VERDICTS: Verdict[] = ["BID", "NO-BID", "MAYBE", "New · Unverified"];
const TIERS: ConfidenceTier[] = ["full", "low", "insufficient"];
const NOTIFICATION_TYPES: NotificationType[] = ["pr-ready", "needs-human", "briefing"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          fontSize: 19,
          marginBottom: 16,
          color: "var(--ink)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function DevComponentsPage() {
  const [toggleOn, setToggleOn] = useState(false);
  const [selectValue, setSelectValue] = useState("");

  return (
    <div style={{ padding: "28px 40px 80px", maxWidth: 1120 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 24, marginBottom: 8 }}>
        Component gallery
      </h1>
      <p style={{ color: "var(--ink-3)", marginBottom: 32, fontSize: 13 }}>
        Every M0 primitive, every stated state. Not a real screen, see /home, /tickets, etc. for
        those (M1).
      </p>

      <Section title="Button">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="primary">Approve plan</Button>
          <Button variant="secondary">Request changes</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="destructive">Discard draft</Button>
          <Button variant="primary" disabled>
            Approve plan
          </Button>
        </div>
      </Section>

      <Section title="Card">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card>
            <div style={{ fontSize: 13, color: "var(--ink-2)" }}>Flat card: default.</div>
          </Card>
          <Card raised eyebrow="Cost" title="Cost estimate">
            <div style={{ fontSize: 13, color: "var(--ink-2)" }}>Raised card with eyebrow + title.</div>
          </Card>
        </div>
      </Section>

      <Section title="Input / Select / Toggle">
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ width: 220 }}>
            <Input placeholder="Search tickets…" />
          </div>
          <div style={{ width: 220 }}>
            <Input placeholder="Disabled" disabled />
          </div>
          <div style={{ width: 220 }}>
            <Select
              placeholder="Outcome reason"
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              options={[
                { value: "price_too_high", label: "Price too high" },
                { value: "went_with_someone_else", label: "Went with someone else" },
                { value: "no_response", label: "No response" },
              ]}
            />
          </div>
          <div style={{ width: 220 }}>
            <Select placeholder="Required field" required options={[{ value: "a", label: "Option A" }]} />
          </div>
          <Toggle checked={toggleOn} onChange={setToggleOn} label="Show example data" />
        </div>
      </Section>

      <Section title="State chip: ticket states (9)">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {TICKET_STATES.map((s) => (
            <StateChip key={s} state={s} />
          ))}
        </div>
      </Section>

      <Section title="State chip: proposal states (4)">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {PROPOSAL_STATES.map((s) => (
            <StateChip key={s} state={s} />
          ))}
        </div>
      </Section>

      <Section title="Verdict badge (4)">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {VERDICTS.map((v) => (
            <VerdictBadge key={v} verdict={v} />
          ))}
        </div>
      </Section>

      <Section title="Confidence meter (3 tiers)">
        <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
          {TIERS.map((t) => (
            <ConfidenceTag
              key={t}
              tier={t}
              missingNote={t !== "full" ? "Missing: past project history with this client" : undefined}
            />
          ))}
        </div>
      </Section>

      <Section title="Epistemic value: Fact / Prediction / Synthetic">
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 420 }}>
          <EpistemicValue kind="fact" value="$0.062 spent" caption="ticketization + plan, logged" />
          <EpistemicValue
            kind="prediction"
            value="$0.40–$1.20"
            evidence="based on 6 past runs (3–5 files)"
          />
          <EpistemicValue kind="prediction" value={undefined} />
          <EpistemicValue kind="synthetic" value="Cover letter preview: seed content" />
        </div>
      </Section>

      <Section title="Price band">
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 420 }}>
          <PriceBand min="$45/hr" max="$65/hr" note="blended: client history + your rate history" />
          <PriceBand min="$40/hr" max="$45/hr" low note="from your rate history only" />
        </div>
      </Section>

      <Section title="Cost estimate module">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 640 }}>
          <Card raised eyebrow="Cost" title="With bucket history">
            <CostEstimateModule
              spent={{ value: "$0.062 spent" }}
              estimate={{ value: "$0.40–$1.20", evidence: "based on 6 past runs (3–5 files)" }}
            />
          </Card>
          <Card raised eyebrow="Cost" title="No bucket history">
            <CostEstimateModule spent={{ value: "$0.062 spent" }} />
          </Card>
        </div>
      </Section>

      <Section title="Human-gate marker">
        <Card raised>
          <HumanGateBar>
            Plan ready for TICKET-142: review before the agent executes.
          </HumanGateBar>
        </Card>
      </Section>

      <Section title="Notification card">
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
          {NOTIFICATION_TYPES.map((t) => (
            <NotificationCard
              key={t}
              type={t}
              title={
                t === "pr-ready"
                  ? "Agent PR ready for review"
                  : t === "needs-human"
                    ? "Agent stuck: needs you"
                    : "Meeting starts in 15 minutes"
              }
              body="Acme Co.: API integration job"
              cached={t === "briefing"}
            />
          ))}
        </div>
      </Section>

      <Section title="Console / live log">
        <Card>
          <ConsoleLog
            lines={[
              { time: "14:02:09", text: "plan approved by user" },
              { time: "14:02:11", text: "applying patch to src/api/webhook.ts" },
              { time: "14:02:19", text: "running test suite…", active: true },
              { time: "14:02:24", text: "3 passed, 0 failed", ok: true },
            ]}
          />
          <div style={{ marginTop: 12 }}>
            <ConsoleButton>Jump to latest</ConsoleButton>
          </div>
        </Card>
      </Section>
    </div>
  );
}
