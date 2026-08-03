"use server";

import { createClient } from "@/lib/supabase/server";
import { listIntegrations, updateIntegration, getGithubAccessToken } from "@/lib/db/integrations";
import { listRepos, createRepo, setDefaultRepo as setDefaultRepoRow, deleteRepo } from "@/lib/db/repos";
import { verifyRepoAccess, listUserRepos } from "@/lib/github";
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

/** Repo full names the connected GitHub account can see, for the "Connect repository" picker. Empty if not connected. */
export async function fetchGithubRepoOptions(): Promise<string[]> {
  const { supabase, ownerId } = await requireOwnerId();
  const token = await getGithubAccessToken(supabase, ownerId);
  if (!token) return [];
  const repos = await listUserRepos(token);
  return repos.map((r) => r.fullName);
}

/** Verifies the repo is reachable with the user's connected GitHub OAuth token, then saves it, default if it's the first. */
export async function connectRepo(fullName: string): Promise<RepoRow> {
  const { supabase, ownerId } = await requireOwnerId();

  const token = await getGithubAccessToken(supabase, ownerId);
  if (!token) throw new Error("Connect GitHub first.");
  await verifyRepoAccess(token, fullName);

  const integration = (await listIntegrations(supabase)).find(
    (i) => i.category === "repo" && i.provider === "github"
  );
  if (!integration) throw new Error("Connect GitHub first.");

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
  await updateIntegration(supabase, github.id, { status: "disconnected", connected_at: null, access_token: null });
}
