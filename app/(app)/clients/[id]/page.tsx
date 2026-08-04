import { ClientDetailScreen } from "@/features/clients/ClientDetailScreen";
import { createClient } from "@/lib/supabase/server";
import { getClient } from "@/lib/db/clients";
import { listClientContacts } from "@/lib/db/client-contacts";
import { listProposals } from "@/lib/db/proposals";
import { listMeetings } from "@/lib/db/meetings";
import { listTickets } from "@/lib/db/tickets";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [client, contacts, allProposals, allMeetings, allTickets] = await Promise.all([
    getClient(supabase, id),
    listClientContacts(supabase, id),
    listProposals(supabase),
    listMeetings(supabase),
    listTickets(supabase),
  ]);
  return (
    <ClientDetailScreen
      client={client}
      initialContacts={contacts}
      proposals={allProposals.filter((p) => p.client_id === id)}
      meetings={allMeetings.filter((m) => m.client_id === id)}
      tickets={allTickets.filter((t) => t.client_id === id)}
    />
  );
}
