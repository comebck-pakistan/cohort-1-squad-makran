"use server";

import { createClient } from "@/lib/supabase/server";
import { parseNotificationPrefs, type NotificationPrefs } from "@/lib/notifications";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function getNotificationPrefs(): Promise<{ prefs: NotificationPrefs; email: string }> {
  const { user } = await requireUser();
  return { prefs: parseNotificationPrefs(user.user_metadata), email: user.email! };
}

export async function saveNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.auth.updateUser({ data: { notification_prefs: prefs } });
  if (error) throw error;
}
