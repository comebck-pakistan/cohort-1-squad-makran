"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import { saveNotificationPrefs } from "@/lib/actions/notifications";
import type { NotificationPrefs } from "@/lib/notifications";
import styles from "./NotificationsScreen.module.css";

interface NotificationsScreenProps {
  initialPrefs: NotificationPrefs;
  email: string;
}

export function NotificationsScreen({ initialPrefs, email }: NotificationsScreenProps) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(initialPrefs);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  async function update(patch: Partial<NotificationPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    try {
      await saveNotificationPrefs(next);
    } catch {
      setPrefs(prefs);
      showToast("Could not save. Try again.");
    }
  }

  return (
    <div className={styles.body}>
      <div className={styles.sectionTitle}>Notifications</div>
      <div className={styles.lede}>Delivered via email. In-app delivery is not built yet, this toggle is saved but has no effect.</div>

      <div className={styles.triggerList}>
        <Card>
          <div className={styles.triggerRow}>
            <div className={styles.triggerLeft}>
              <span className={[styles.dot, styles.dotVerified].join(" ")}>●</span>
              <div>
                <div className={styles.triggerTitle}>PR ready for review</div>
                <div className={styles.triggerDesc}>
                  Sent when the agent opens a PR and the ticket reaches review state.
                </div>
              </div>
            </div>
            <div className={styles.toggles}>
              <Toggle checked={prefs.prReadyEmail} onChange={(v) => update({ prReadyEmail: v })} label="Email" />
              <Toggle checked={prefs.prReadyInApp} onChange={(v) => update({ prReadyInApp: v })} label="In-app" />
            </div>
          </div>
        </Card>

        <Card>
          <div className={styles.triggerRow}>
            <div className={styles.triggerLeft}>
              <span className={[styles.dot, styles.dotRisk].join(" ")}>●</span>
              <div>
                <div className={styles.triggerTitle}>Agent stuck: needs your help</div>
                <div className={styles.triggerDesc}>
                  Sent when a ticket reaches needs_human after 3 failed attempts.
                </div>
              </div>
            </div>
            <div className={styles.toggles}>
              <Toggle checked={prefs.stuckEmail} onChange={(v) => update({ stuckEmail: v })} label="Email" />
              <Toggle checked={prefs.stuckInApp} onChange={(v) => update({ stuckInApp: v })} label="In-app" />
            </div>
          </div>
        </Card>

        <Card>
          <div className={styles.triggerRow}>
            <div className={styles.triggerLeft}>
              <span className={[styles.dot, styles.dotSignal].join(" ")}>●</span>
              <div>
                <div className={styles.triggerTitle}>Pre-meeting prep briefing</div>
                <div className={styles.triggerDesc}>
                  Sent 15 minutes before a calendar meeting with a known client. Includes bid
                  verdict, price band, and past proposal outcomes.
                </div>
                <div className={styles.triggerSubNote}>
                  Only fires for known clients. New contacts have nothing to brief on yet.
                </div>
              </div>
            </div>
            <div className={styles.toggles}>
              <Toggle checked={prefs.briefingEmail} onChange={(v) => update({ briefingEmail: v })} label="Email" />
              <Toggle checked={prefs.briefingInApp} onChange={(v) => update({ briefingInApp: v })} label="In-app" />
            </div>
          </div>
        </Card>
      </div>

      <div className={styles.everyChangeBox}>
        <div className={styles.everyChangeLeft}>
          <div className={styles.triggerTitle}>Every ticket status change</div>
          <div className={styles.triggerDesc}>
            Get notified on every state transition: backlog, in_progress, agent_running, and so
            on. Off by default to avoid noise.
          </div>
        </div>
        <div className={styles.everyChangeRight}>
          <Toggle checked={prefs.everyChange} onChange={(v) => update({ everyChange: v })} />
          <span className={styles.everyChangeNote}>Off by default</span>
        </div>
      </div>

      <Card>
        <div className={styles.emailRow}>
          <div>
            <div className={styles.emailLabel}>Email address</div>
            <div className={styles.emailValue}>{email}</div>
          </div>
          <button className={styles.changeLink} onClick={() => showToast("Change email: coming soon.")}>
            Change
          </button>
        </div>
        <div className={styles.emailFootNote}>
          Notification emails are sent via Nodemailer/Gmail SMTP. Check your spam folder if
          you&rsquo;re not seeing them.
        </div>
      </Card>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--ink)",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "var(--r-md)",
            fontSize: 14,
            boxShadow: "var(--shadow-pop)",
            zIndex: 20,
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
