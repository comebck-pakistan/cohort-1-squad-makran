import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationRow, NotificationType } from "@/types/db";

export async function listNotifications(supabase: SupabaseClient, limit = 20): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as NotificationRow[];
}

export async function createNotification(
  supabase: SupabaseClient,
  row: { owner_id: string; type: NotificationType; title: string; body: string; link?: string }
): Promise<NotificationRow> {
  const { data, error } = await supabase.from("notifications").insert(row).select().single();
  if (error) throw error;
  return data as NotificationRow;
}

export async function markNotificationRead(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(supabase: SupabaseClient, ownerId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("owner_id", ownerId)
    .is("read_at", null);
  if (error) throw error;
}
