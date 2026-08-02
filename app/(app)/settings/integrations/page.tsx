import { IntegrationsScreen } from "@/features/settings/IntegrationsScreen";
import { createClient } from "@/lib/supabase/server";
import { listIntegrations } from "@/lib/db/integrations";
import { listRepos } from "@/lib/db/repos";
import { getExtensionTokenStatus } from "@/lib/actions/extension-tokens";

export default async function SettingsIntegrationsPage() {
  const supabase = await createClient();
  const [integrations, repos, extensionToken] = await Promise.all([
    listIntegrations(supabase),
    listRepos(supabase),
    getExtensionTokenStatus(),
  ]);
  return (
    <IntegrationsScreen
      initialIntegrations={integrations}
      initialRepos={repos}
      initialExtensionConnected={extensionToken.connected}
    />
  );
}
