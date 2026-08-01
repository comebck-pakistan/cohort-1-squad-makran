import { PreMeetingBriefingScreen } from "@/features/meetings/PreMeetingBriefingScreen";

export default async function PreMeetingBriefingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PreMeetingBriefingScreen meetingId={id} />;
}
