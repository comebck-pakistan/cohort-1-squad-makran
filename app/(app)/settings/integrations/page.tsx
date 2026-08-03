import { IntegrationsScreen } from "@/features/settings/IntegrationsScreen";
import { createClient } from "@/lib/supabase/server";
import { listIntegrations } from "@/lib/db/integrations";
import { listRepos } from "@/lib/db/repos";
import { getExtensionTokenStatus } from "@/lib/actions/extension-tokens";
import { fetchGithubRepoOptions } from "@/lib/actions/repos";

export default async function SettingsIntegrationsPage() {
  const supabase = await createClient();
  const [integrations, repos, extensionToken, repoOptions] = await Promise.all([
    listIntegrations(supabase),
    listRepos(supabase),
    getExtensionTokenStatus(),
    fetchGithubRepoOptions(),
  ]);
  return (
    <IntegrationsScreen
      initialIntegrations={integrations}
      initialRepos={repos}
      initialExtensionConnected={extensionToken.connected}
      initialRepoOptions={repoOptions}
    />
  );
}
