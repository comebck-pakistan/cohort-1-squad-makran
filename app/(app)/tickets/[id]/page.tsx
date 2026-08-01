import { TicketDetailScreen } from "@/features/tickets/TicketDetailScreen";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TicketDetailScreen ticketId={id} />;
}
