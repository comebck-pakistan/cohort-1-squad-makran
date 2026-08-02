"use server";

import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getExtensionToken, setExtensionToken } from "@/lib/db/extension-tokens";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function getExtensionTokenStatus(): Promise<{ connected: boolean; createdAt: string | null }> {
  const { supabase, user } = await requireUser();
  const row = await getExtensionToken(supabase, user.id);
  return { connected: !!row, createdAt: row?.created_at ?? null };
}

/** Returns the raw token once. It's stored plaintext (same trust level as GITHUB_TOKEN), never returned again after this. */
export async function generateExtensionToken(): Promise<string> {
  const { supabase, user } = await requireUser();
  const token = `aos_${randomBytes(24).toString("hex")}`;
  await setExtensionToken(supabase, user.id, token);
  return token;
}
