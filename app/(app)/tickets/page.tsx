import { TicketsBoardScreen } from "@/features/tickets/TicketsBoardScreen";
import { createClient } from "@/lib/supabase/server";
import { listTickets } from "@/lib/db/tickets";
import { listRepos } from "@/lib/db/repos";

export default async function TicketsPage() {
  const supabase = await createClient();
  const [tickets, repos] = await Promise.all([listTickets(supabase), listRepos(supabase)]);
  return <TicketsBoardScreen initialTickets={tickets} repos={repos} />;
}
