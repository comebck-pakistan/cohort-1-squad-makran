import { ReactNode } from "react";
import styles from "./NotificationCard.module.css";

export type NotificationType = "pr-ready" | "needs-human" | "briefing";

const ACCENTS: Record<NotificationType, string> = {
  "pr-ready": "var(--verified)",
  "needs-human": "var(--risk)",
  briefing: "var(--signal)",
};

interface NotificationCardProps {
  type: NotificationType;
  title: ReactNode;
  body: ReactNode;
  /** Pre-meeting briefings read from cache, no new LLM call: surfaced literally. */
  cached?: boolean;
}

export function NotificationCard({ type, title, body, cached }: NotificationCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.bar} style={{ background: ACCENTS[type] }} />
      <div className={styles.title}>{title}</div>
      <div className={styles.body}>{body}</div>
      {cached && <div className={styles.cached}>from cache</div>}
    </div>
  );
}
