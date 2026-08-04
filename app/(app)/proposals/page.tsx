import { ProposalsListScreen } from "@/features/proposals/ProposalsListScreen";
import { createClient } from "@/lib/supabase/server";
import { listProposals } from "@/lib/db/proposals";
import { listClients } from "@/lib/db/clients";

export default async function ProposalsPage() {
  const supabase = await createClient();
  const [proposals, clients] = await Promise.all([listProposals(supabase), listClients(supabase)]);
  return <ProposalsListScreen initialProposals={proposals} clients={clients} />;
}
