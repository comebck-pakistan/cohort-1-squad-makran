import { ReactNode } from "react";
import { NavRail } from "./NavRail";
import styles from "./AppShell.module.css";

interface AppShellProps {
  children: ReactNode;
}

/** 240px nav rail + fluid content area capped at 1120px (design-system.md §7). */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <NavRail />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
