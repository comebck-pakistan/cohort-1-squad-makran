"use server";

import { createClient } from "@/lib/supabase/server";
import { listIntegrations, createIntegration, updateIntegration } from "@/lib/db/integrations";
import { listRepos, createRepo, setDefaultRepo as setDefaultRepoRow, deleteRepo } from "@/lib/db/repos";
import { verifyRepoAccess, getAuthenticatedLogin } from "@/lib/github";
import type { IntegrationRow, RepoRow } from "@/types/db";

async function requireOwnerId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, ownerId: user.id };
}

export async function fetchIntegrations(): Promise<IntegrationRow[]> {
  const { supabase } = await requireOwnerId();
  return listIntegrations(supabase);
}

export async function fetchRepos(): Promise<RepoRow[]> {
  const { supabase } = await requireOwnerId();
  return listRepos(supabase);
}

async function getOrCreateGithubIntegration(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerId: string
): Promise<IntegrationRow> {
  const existing = (await listIntegrations(supabase)).find((i) => i.category === "repo" && i.provider === "github");
  const login = await getAuthenticatedLogin();
  if (existing) {
    if (existing.status !== "connected" || existing.account_label !== login) {
      return updateIntegration(supabase, existing.id, {
        status: "connected",
        connected_at: new Date().toISOString(),
        account_label: login,
      });
    }
    return existing;
  }
  return createIntegration(supabase, {
    owner_id: ownerId,
    category: "repo",
    provider: "github",
    status: "connected",
    connected_at: new Date().toISOString(),
    account_label: login,
  });
}

/** Verifies the repo is reachable with GITHUB_TOKEN before saving it, then connects it as the default if it's the first. */
export async function connectRepo(fullName: string): Promise<RepoRow> {
  const { supabase, ownerId } = await requireOwnerId();
  await verifyRepoAccess(fullName);

  const integration = await getOrCreateGithubIntegration(supabase, ownerId);
  const existingRepos = await listRepos(supabase);

  return createRepo(supabase, {
    owner_id: ownerId,
    integration_id: integration.id,
    provider: "github",
    full_name: fullName,
    is_default: existingRepos.length === 0,
  });
}

export async function removeRepo(id: string): Promise<void> {
  const { supabase } = await requireOwnerId();
  await deleteRepo(supabase, id);
}

export async function setDefaultRepo(id: string): Promise<void> {
  const { supabase } = await requireOwnerId();
  await setDefaultRepoRow(supabase, id);
}

export async function disconnectGithub(): Promise<void> {
  const { supabase } = await requireOwnerId();
  const integrations = await listIntegrations(supabase);
  const github = integrations.find((i) => i.category === "repo" && i.provider === "github");
  if (!github) return;
  const repos = await listRepos(supabase);
  for (const repo of repos) {
    await deleteRepo(supabase, repo.id);
  }
  await updateIntegration(supabase, github.id, { status: "disconnected", connected_at: null });
}
