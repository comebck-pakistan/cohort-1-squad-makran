"use server";

import { createClient } from "@/lib/supabase/server";
import { listIntegrations, getGithubAccessToken } from "@/lib/db/integrations";
import { listRepos, createRepo } from "@/lib/db/repos";
import { createGithubRepo } from "@/lib/github";
import { createNotification } from "@/lib/db/notifications";
import { sendEmail } from "@/lib/mail";
import type { RepoRow } from "@/types/db";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "client"
  );
}

/**
 * One repo per client (handoff hard rule: minimum viable human intervention). Reuses an
 * existing repo for repeat meetings with the same client instead of creating a new one each
 * time, only ever creates once per client.
 */
export async function ensureClientRepo(clientId: string, clientName: string): Promise<RepoRow> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");

  const existing = await listRepos(supabase);
  const clientRepo = existing.find((r) => r.client_id === clientId);
  if (clientRepo) return clientRepo;

  const token = await getGithubAccessToken(supabase, user.id);
  if (!token) throw new Error("Connect GitHub in Settings before repos can be created automatically.");

  const integration = (await listIntegrations(supabase)).find(
    (i) => i.category === "repo" && i.provider === "github"
  );
  if (!integration) throw new Error("Connect GitHub in Settings before repos can be created automatically.");

  const base = slugify(clientName);
  let created;
  let name = base;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      created = await createGithubRepo(token, {
        name,
        description: `Solvo project repo for ${clientName}`,
      });
      break;
    } catch (err) {
      const isNameCollision = err instanceof Error && err.message.startsWith("github_request_invalid");
      if (!isNameCollision || attempt === 2) throw err;
      name = `${base}-${attempt + 2}`;
    }
  }
  if (!created) throw new Error("Could not create a repo after retrying name collisions.");

  const repo = await createRepo(supabase, {
    owner_id: user.id,
    integration_id: integration.id,
    provider: "github",
    full_name: created.fullName,
    client_id: clientId,
    is_default: existing.length === 0,
  });

  const clientUrl = `${APP_URL}/clients/${clientId}`;
  await createNotification(supabase, {
    owner_id: user.id,
    type: "repo-created",
    title: `Repo created: ${created.fullName}`,
    body: `Solvo created a new private GitHub repo for ${clientName}. The agent will start work on it once you approve its plan.`,
    link: clientUrl,
  });
  if (user.email) {
    await sendEmail({
      to: user.email,
      subject: `Repo created: ${created.fullName}`,
      html: `<h2>Repo created: ${created.fullName}</h2><p>Solvo created a new private GitHub repo for ${clientName}. The agent will start work on it once you approve its plan.</p><p><a href="${clientUrl}">${clientUrl}</a></p>`,
    });
  }

  return repo;
}
