import { ReactNode } from "react";
import { EpistemicValue } from "./EpistemicValue";

interface CostEstimateModuleProps {
  spent: { value: ReactNode; caption?: ReactNode };
  /** Omit (or omit `evidence`) when there's no bucket history: never fabricate an estimate. */
  estimate?: { value: ReactNode; evidence?: ReactNode };
}

export function CostEstimateModule({ spent, estimate }: CostEstimateModuleProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <EpistemicValue kind="fact" value={spent.value} caption={spent.caption ?? "ticketization + plan, logged"} />
      <EpistemicValue kind="prediction" value={estimate?.value} evidence={estimate?.evidence} />
    </div>
  );
}
