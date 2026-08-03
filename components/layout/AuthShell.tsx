import { ReactNode } from "react";
import styles from "./AuthShell.module.css";

interface AuthShellProps {
  children: ReactNode;
}

/** Centered, no-nav-rail shell for sign-in / sign-up (design-system.md, no team/org chrome in v1.0). */
export function AuthShell({ children }: AuthShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.panel}>
        <div className={styles.brand}>Solvo</div>
        {children}
      </div>
    </div>
  );
}
