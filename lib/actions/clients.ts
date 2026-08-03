"use server";

import { createClient } from "@/lib/supabase/server";
import { updateClientRow } from "@/lib/db/clients";
import type { ClientRow } from "@/types/db";

async function requireOwnerId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, ownerId: user.id };
}

export async function saveCommunicationNotes(clientId: string, notes: string): Promise<ClientRow> {
  const { supabase } = await requireOwnerId();
  return updateClientRow(supabase, clientId, { communication_notes: notes.trim() || null });
}
