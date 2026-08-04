"use server";

import { createClient } from "@/lib/supabase/server";
import { listIntegrations, updateIntegration } from "@/lib/db/integrations";

async function requireOwnerId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, ownerId: user.id };
}

export async function disconnectGoogleCalendar(): Promise<void> {
  const { supabase } = await requireOwnerId();
  const integration = (await listIntegrations(supabase)).find(
    (i) => i.category === "calendar" && i.provider === "google_calendar"
  );
  if (!integration) return;
  await updateIntegration(supabase, integration.id, {
    status: "disconnected",
    connected_at: null,
    access_token: null,
    refresh_token: null,
    token_expires_at: null,
  });
}
