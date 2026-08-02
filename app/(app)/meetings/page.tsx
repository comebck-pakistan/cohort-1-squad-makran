import { MeetingsOverviewScreen } from "@/features/meetings/MeetingsOverviewScreen";
import { createClient } from "@/lib/supabase/server";
import { listMeetings } from "@/lib/db/meetings";

export default async function MeetingsPage() {
  const supabase = await createClient();
  const meetings = await listMeetings(supabase);
  return <MeetingsOverviewScreen initialMeetings={meetings} />;
}
