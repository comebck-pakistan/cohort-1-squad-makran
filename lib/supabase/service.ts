import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/db";

/**
 * Service-role client, bypasses RLS. Server-only: for Inngest functions and webhook handlers
 * that run outside a signed-in user's request/cookie context and must act across owners
 * (e.g. looking up which owner a Recall webhook's bot_id belongs to).
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
