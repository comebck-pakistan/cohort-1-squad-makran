import { ReactNode } from "react";
import styles from "./HumanGateBar.module.css";

interface HumanGateBarProps {
  children: ReactNode;
}

/** Marks every point where a human must approve something (design-system.md §4e). */
export function HumanGateBar({ children }: HumanGateBarProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.bar} />
      <div className={styles.marker}>● Action needed</div>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
