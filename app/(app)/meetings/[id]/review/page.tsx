import { MeetingDraftReviewScreen } from "@/features/meetings/MeetingDraftReviewScreen";
import { createClient } from "@/lib/supabase/server";
import { getMeeting } from "@/lib/db/meetings";
import { listRepos } from "@/lib/db/repos";
import { listClients } from "@/lib/db/clients";

export default async function MeetingDraftReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [meeting, repos, clients] = await Promise.all([
    getMeeting(supabase, id),
    listRepos(supabase),
    listClients(supabase),
  ]);
  return <MeetingDraftReviewScreen meeting={meeting} repos={repos} clients={clients} />;
}
