"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";
import styles from "./NotificationsScreen.module.css";

interface ChannelPrefs {
  email: boolean;
  inApp: boolean;
}

export function NotificationsScreen() {
  const [prReady, setPrReady] = useState<ChannelPrefs>({ email: true, inApp: true });
  const [stuck, setStuck] = useState<ChannelPrefs>({ email: true, inApp: true });
  const [briefing, setBriefing] = useState<ChannelPrefs>({ email: true, inApp: false });
  const [everyChange, setEveryChange] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  return (
    <div className={styles.body}>
      <div className={styles.sectionTitle}>Notifications</div>
      <div className={styles.lede}>Delivered via email and in-app. Email goes to jordan@gmail.com.</div>

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
              <Toggle checked={prReady.email} onChange={(v) => setPrReady((p) => ({ ...p, email: v }))} label="Email" />
              <Toggle checked={prReady.inApp} onChange={(v) => setPrReady((p) => ({ ...p, inApp: v }))} label="In-app" />
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
              <Toggle checked={stuck.email} onChange={(v) => setStuck((p) => ({ ...p, email: v }))} label="Email" />
              <Toggle checked={stuck.inApp} onChange={(v) => setStuck((p) => ({ ...p, inApp: v }))} label="In-app" />
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
              <Toggle checked={briefing.email} onChange={(v) => setBriefing((p) => ({ ...p, email: v }))} label="Email" />
              <Toggle checked={briefing.inApp} onChange={(v) => setBriefing((p) => ({ ...p, inApp: v }))} label="In-app" />
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
          <Toggle checked={everyChange} onChange={setEveryChange} />
          <span className={styles.everyChangeNote}>Off by default</span>
        </div>
      </div>

      <Card>
        <div className={styles.emailRow}>
          <div>
            <div className={styles.emailLabel}>Email address</div>
            <div className={styles.emailValue}>jordan@gmail.com</div>
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
