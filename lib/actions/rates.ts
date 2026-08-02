"use server";

import { createClient } from "@/lib/supabase/server";
import { parseRateHistory, type RateEntry } from "@/lib/rates";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function getRateHistory(): Promise<RateEntry[]> {
  const { user } = await requireUser();
  return parseRateHistory(user.user_metadata);
}

export async function saveRateHistory(rates: RateEntry[]): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ data: { rate_history: rates } });
  if (error) throw error;
}
