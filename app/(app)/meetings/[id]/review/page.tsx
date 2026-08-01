import { MeetingDraftReviewScreen } from "@/features/meetings/MeetingDraftReviewScreen";

export default async function MeetingDraftReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeetingDraftReviewScreen meetingId={id} />;
}
