import { NotificationsScreen } from "@/features/settings/NotificationsScreen";
import { getNotificationPrefs } from "@/lib/actions/notifications";

export default async function SettingsNotificationsPage() {
  const { prefs, email } = await getNotificationPrefs();
  return <NotificationsScreen initialPrefs={prefs} email={email} />;
}
