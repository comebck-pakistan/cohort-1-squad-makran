import { ClientsListScreen } from "@/features/clients/ClientsListScreen";
import { createClient } from "@/lib/supabase/server";
import { listClients } from "@/lib/db/clients";
import { listProposals } from "@/lib/db/proposals";

export default async function ClientsPage() {
  const supabase = await createClient();
  const [clients, proposals] = await Promise.all([listClients(supabase), listProposals(supabase)]);
  return <ClientsListScreen initialClients={clients} proposals={proposals} />;
}
