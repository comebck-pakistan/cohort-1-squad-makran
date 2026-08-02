import { PreMeetingBriefingScreen } from "@/features/meetings/PreMeetingBriefingScreen";
import { createClient } from "@/lib/supabase/server";
import { getMeeting } from "@/lib/db/meetings";
import { getClient } from "@/lib/db/clients";
import { listClientContacts } from "@/lib/db/client-contacts";
import { listProposals } from "@/lib/db/proposals";

export default async function PreMeetingBriefingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const meeting = await getMeeting(supabase, id);
  const client = meeting?.client_id ? await getClient(supabase, meeting.client_id) : null;
  const [contacts, allProposals] = await Promise.all([
    client ? listClientContacts(supabase, client.id) : Promise.resolve([]),
    listProposals(supabase),
  ]);
  const pastProposals = client ? allProposals.filter((p) => p.client_id === client.id).slice(0, 3) : [];

  return <PreMeetingBriefingScreen meeting={meeting} client={client} contacts={contacts} pastProposals={pastProposals} />;
}
