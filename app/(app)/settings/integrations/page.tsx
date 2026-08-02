import { IntegrationsScreen } from "@/features/settings/IntegrationsScreen";
import { createClient } from "@/lib/supabase/server";
import { listIntegrations } from "@/lib/db/integrations";
import { listRepos } from "@/lib/db/repos";

export default async function SettingsIntegrationsPage() {
  const supabase = await createClient();
  const [integrations, repos] = await Promise.all([listIntegrations(supabase), listRepos(supabase)]);
  return <IntegrationsScreen initialIntegrations={integrations} initialRepos={repos} />;
}
