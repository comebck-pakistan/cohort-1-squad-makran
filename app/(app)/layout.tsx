import { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getMyNotifications } from "@/lib/actions/notifications";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const notifications = await getMyNotifications();
  return <AppShell notifications={notifications}>{children}</AppShell>;
}
