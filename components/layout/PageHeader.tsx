import { ReactNode } from "react";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
  title: ReactNode;
  action?: ReactNode;
}

/** Shared "title + optional primary action" top bar (design-system.md web command center screens). */
export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.title}>{title}</div>
      {action}
    </div>
  );
}
