import { notFound } from "next/navigation";
import { TicketDetailScreen } from "@/features/tickets/TicketDetailScreen";
import { createClient } from "@/lib/supabase/server";
import { getTicket } from "@/lib/db/tickets";
import { listAgentRuns, estimateCost } from "@/lib/db/agent-runs";
import { listRepos } from "@/lib/db/repos";

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [ticket, runs, repos, costEstimate] = await Promise.all([
    getTicket(supabase, id),
    listAgentRuns(supabase, id),
    listRepos(supabase),
    estimateCost(supabase),
  ]);

  if (!ticket) notFound();

  const repoFullName = repos.find((r) => r.id === ticket.repo_id)?.full_name ?? null;

  return <TicketDetailScreen ticket={ticket} runs={runs} repoFullName={repoFullName} costEstimate={costEstimate} />;
}
