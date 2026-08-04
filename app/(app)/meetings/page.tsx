import { MeetingsOverviewScreen } from "@/features/meetings/MeetingsOverviewScreen";
import { createClient } from "@/lib/supabase/server";
import { listMeetings } from "@/lib/db/meetings";
import { listClients } from "@/lib/db/clients";

export default async function MeetingsPage() {
  const supabase = await createClient();
  const [meetings, clients] = await Promise.all([listMeetings(supabase), listClients(supabase)]);
  return <MeetingsOverviewScreen initialMeetings={meetings} clients={clients} />;
}
