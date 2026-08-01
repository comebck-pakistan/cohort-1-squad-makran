import styles from "./StateChip.module.css";
import type { ProposalState, TicketState } from "./types";

type State = TicketState | ProposalState;

interface StateDef {
  color: string;
  bg: string;
  /** Live/running states get an animated dot. */
  pulse?: boolean;
  /** Human-approval-gate states (design-system.md §5 state-chip table) get a static marker dot. */
  gate?: boolean;
}

const STATES: Record<State, StateDef> = {
  backlog: { color: "var(--ink-3)", bg: "var(--panel-2)" },
  in_progress: { color: "var(--signal)", bg: "var(--signal-tint)" },
  agent_running: { color: "var(--signal)", bg: "var(--signal-tint)", pulse: true },
  awaiting_plan_approval: { color: "var(--predict)", bg: "var(--predict-tint)", gate: true },
  executing: { color: "var(--signal)", bg: "var(--signal-tint)", pulse: true },
  review: { color: "var(--predict)", bg: "var(--predict-tint)", gate: true },
  changes_requested: { color: "var(--predict)", bg: "var(--predict-tint)" },
  needs_human: { color: "var(--risk)", bg: "var(--risk-tint)" },
  done: { color: "var(--verified)", bg: "var(--verified-tint)" },
  draft: { color: "var(--ink-3)", bg: "var(--panel-2)" },
  sent: { color: "var(--signal)", bg: "var(--signal-tint)" },
  won: { color: "var(--verified)", bg: "var(--verified-tint)" },
  lost: { color: "var(--risk)", bg: "var(--risk-tint)" },
};

interface StateChipProps {
  state: State;
}

export function StateChip({ state }: StateChipProps) {
  const s = STATES[state];
  return (
    <span className={styles.chip} style={{ background: s.bg, color: s.color }}>
      {(s.pulse || s.gate) && (
        <span
          className={[styles.dot, s.pulse && styles.pulse].filter(Boolean).join(" ")}
          style={{ background: s.color }}
        />
      )}
      {state}
    </span>
  );
}
