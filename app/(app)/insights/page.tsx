import { InsightsDashboardScreen } from "@/features/insights/InsightsDashboardScreen";
import { createClient } from "@/lib/supabase/server";
import { listProposals } from "@/lib/db/proposals";

export default async function InsightsPage() {
  const supabase = await createClient();
  const proposals = await listProposals(supabase);
  return <InsightsDashboardScreen initialProposals={proposals} />;
}
