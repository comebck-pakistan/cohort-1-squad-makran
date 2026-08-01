import { ClientDetailScreen } from "@/features/clients/ClientDetailScreen";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientDetailScreen clientId={id} />;
}
