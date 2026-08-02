import { ProposalsListScreen } from "@/features/proposals/ProposalsListScreen";
import { createClient } from "@/lib/supabase/server";
import { listProposals } from "@/lib/db/proposals";

export default async function ProposalsPage() {
  const supabase = await createClient();
  const proposals = await listProposals(supabase);
  return <ProposalsListScreen initialProposals={proposals} />;
}
