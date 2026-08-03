import { ReactNode } from "react";
import { NavRail } from "./NavRail";
import type { NotificationRow } from "@/types/db";
import styles from "./AppShell.module.css";

interface AppShellProps {
  children: ReactNode;
  notifications: NotificationRow[];
}

/** 240px nav rail + fluid content area capped at 1120px (design-system.md §7). */
export function AppShell({ children, notifications }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <NavRail notifications={notifications} />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
