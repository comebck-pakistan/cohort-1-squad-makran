export interface NotificationPrefs {
  prReadyEmail: boolean;
  prReadyInApp: boolean;
  stuckEmail: boolean;
  stuckInApp: boolean;
  briefingEmail: boolean;
  briefingInApp: boolean;
  everyChange: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  prReadyEmail: true,
  prReadyInApp: true,
  stuckEmail: true,
  stuckInApp: true,
  briefingEmail: true,
  briefingInApp: false,
  everyChange: false,
};

/** Stored on auth.users.user_metadata.notification_prefs, same pattern as M3's voice profile: a per-user singleton, no new table. */
export function parseNotificationPrefs(metadata: Record<string, unknown> | null | undefined): NotificationPrefs {
  const raw = (metadata?.notification_prefs ?? {}) as Partial<NotificationPrefs>;
  return { ...DEFAULT_NOTIFICATION_PREFS, ...raw };
}
