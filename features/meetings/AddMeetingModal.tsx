"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import styles from "./AddMeetingModal.module.css";

interface AddMeetingModalProps {
  onClose: () => void;
  onScheduled: (message: string) => void;
}

export function AddMeetingModal({ onClose, onScheduled }: AddMeetingModalProps) {
  const [meetingLink, setMeetingLink] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [dateVal, setDateVal] = useState("Wed, Aug 5");
  const [timeVal, setTimeVal] = useState("10:00 AM");
  const [notes, setNotes] = useState("");
  const [joinNowMode, setJoinNowMode] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.wrap}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <div className={styles.title}>Add meeting</div>
            <button className={styles.close} onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>Meeting link</div>
            <Input
              placeholder="Paste a Zoom or Google Meet link"
              value={meetingLink}
              onChange={(e) => {
                setMeetingLink(e.target.value);
                if (linkError) setLinkError(null);
              }}
            />
            {linkError ? (
              <div className={styles.fieldError}>{linkError}</div>
            ) : (
              <div className={styles.fieldHint}>The bot joins using only this link, no Zoom or Google account needed.</div>
            )}
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>
              Client <span className={styles.fieldOptional}>(optional)</span>
            </div>
            <div className={styles.searchWrap}>
              <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
              </svg>
              <input
                className={styles.searchInput}
                placeholder="Search clients…"
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
              />
            </div>
            <button className={styles.addClientLink}>+ Add new client</button>
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>When</div>
            {!joinNowMode ? (
              <>
                <div className={styles.whenGrid}>
                  <input className={styles.plainInput} value={dateVal} onChange={(e) => setDateVal(e.target.value)} />
                  <input className={styles.plainInput} value={timeVal} onChange={(e) => setTimeVal(e.target.value)} />
                </div>
                <div style={{ marginTop: 10 }}>
                  <Button variant="secondary" onClick={() => setJoinNowMode(true)} className={styles.joinNowToggle}>
                    <span className={styles.joinNowToggleDot} />
                    Join Now: call is already in progress
                  </Button>
                </div>
              </>
            ) : (
              <div className={styles.joinNowBar}>
                <span className={styles.joinNowLabel}>
                  <span className={styles.joinNowDot} />
                  Joining now: call already in progress
                </span>
                <button className={styles.useScheduledLink} onClick={() => setJoinNowMode(false)}>
                  Use scheduled time
                </button>
              </div>
            )}
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>
              Notes <span className={styles.fieldOptional}>(optional)</span>
            </div>
            <textarea
              className={styles.textarea}
              placeholder="e.g. Discovery call, reviewing project scope"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className={styles.notice}>
            A bot will join as a participant and capture the transcript. The client will see it in the call.
          </div>

          <div className={styles.footer}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!meetingLink.trim()) {
                  setLinkError("Add a meeting link before scheduling the bot.");
                  return;
                }
                onScheduled(joinNowMode ? "Bot joining now." : `Bot scheduled for ${dateVal} at ${timeVal}.`);
              }}
            >
              Schedule bot
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
