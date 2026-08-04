import { HomeScreen } from "@/features/home/HomeScreen";
import { createClient } from "@/lib/supabase/server";
import { listTickets } from "@/lib/db/tickets";
import { listMeetings } from "@/lib/db/meetings";
import { listProposals } from "@/lib/db/proposals";
import { listRepos } from "@/lib/db/repos";
import { listClients } from "@/lib/db/clients";

export default async function HomePage() {
  const supabase = await createClient();
  const [tickets, meetings, proposals, repos, clients] = await Promise.all([
    listTickets(supabase),
    listMeetings(supabase),
    listProposals(supabase),
    listRepos(supabase),
    listClients(supabase),
  ]);
  return <HomeScreen tickets={tickets} meetings={meetings} proposals={proposals} repos={repos} clients={clients} />;
}
