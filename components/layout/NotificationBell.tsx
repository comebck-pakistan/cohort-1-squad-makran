"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NotificationCard } from "@/components/feedback/NotificationCard";
import { formatRelative } from "@/lib/format";
import { markAllNotificationsAsRead, markNotificationAsRead } from "@/lib/actions/notifications";
import type { NotificationRow } from "@/types/db";
import styles from "./NotificationBell.module.css";

interface NotificationBellProps {
  initialNotifications: NotificationRow[];
}

export function NotificationBell({ initialNotifications }: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function handleOpenNotification(n: NotificationRow) {
    if (!n.read_at) {
      setNotifications((prev) => prev.map((p) => (p.id === n.id ? { ...p, read_at: new Date().toISOString() } : p)));
      await markNotificationAsRead(n.id);
    }
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((p) => ({ ...p, read_at: p.read_at ?? new Date().toISOString() })));
    await markAllNotificationsAsRead();
  }

  return (
    <div className={styles.wrap}>
      <button
        className={styles.bellButton}
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
      >
        <span className={styles.bellIcon}>&#128276;</span>
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>

      {open && (
        <>
          <div className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Notifications</span>
              {unreadCount > 0 && (
                <button className={styles.markAllButton} onClick={handleMarkAllRead}>
                  Mark all read
                </button>
              )}
            </div>
            <div className={styles.panelList}>
              {notifications.length === 0 ? (
                <div className={styles.empty}>Nothing yet. Agent updates and briefings will show up here.</div>
              ) : (
                notifications.map((n) => (
                  <button key={n.id} className={styles.item} onClick={() => handleOpenNotification(n)}>
                    <div className={n.read_at ? styles.itemRead : styles.itemUnread}>
                      <NotificationCard
                        type={n.type}
                        title={n.title}
                        body={
                          <>
                            {n.body}
                            <div className={styles.itemTime}>{formatRelative(n.created_at)}</div>
                          </>
                        }
                      />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
