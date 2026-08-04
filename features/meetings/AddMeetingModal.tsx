"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search } from "lucide-react";
import { scheduleBotMeeting, createManualMeeting } from "@/lib/actions/meetings";
import type { MeetingRow } from "@/types/db";
import styles from "./AddMeetingModal.module.css";

interface AddMeetingModalProps {
  onClose: () => void;
  onCreated: (meeting: MeetingRow, message: string) => void;
}

type Mode = "bot" | "manual";

export function AddMeetingModal({ onClose, onCreated }: AddMeetingModalProps) {
  const [mode, setMode] = useState<Mode>("bot");
  const [title, setTitle] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [transcript, setTranscript] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [dateVal, setDateVal] = useState("2026-08-05");
  const [timeVal, setTimeVal] = useState("10:00");
  const [joinNowMode, setJoinNowMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!title.trim()) {
      setError("Add a title before scheduling.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "bot") {
        if (!meetingLink.trim()) {
          setError("Add a meeting link before scheduling the bot.");
          setSubmitting(false);
          return;
        }
        const startsAt = joinNowMode ? new Date().toISOString() : new Date(`${dateVal}T${timeVal}`).toISOString();
        const meeting = await scheduleBotMeeting({
          title: title.trim(),
          meetingUrl: meetingLink.trim(),
          clientId: null,
          guestEmail: null,
          startsAt,
        });
        onCreated(meeting, joinNowMode ? "Bot joining now." : `Bot scheduled for ${dateVal} at ${timeVal}.`);
      } else {
        if (!transcript.trim()) {
          setError("Paste the transcript text before continuing.");
          setSubmitting(false);
          return;
        }
        const meeting = await createManualMeeting({
          title: title.trim(),
          transcript,
          clientId: null,
          startsAt: new Date().toISOString(),
        });
        onCreated(meeting, "Transcript received, drafting tickets.");
      }
    } catch {
      setError(mode === "bot" ? "Could not schedule the bot. Check Skribby is configured." : "Could not process the transcript.");
      setSubmitting(false);
    }
  }

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
            <div className={styles.fieldLabel}>Title</div>
            <Input placeholder="e.g. Call with Marcus Webb" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className={styles.field} style={{ display: "flex", gap: 8 }}>
            <Button variant={mode === "bot" ? "primary" : "secondary"} onClick={() => setMode("bot")} style={{ flex: 1 }}>
              Bot joins call
            </Button>
            <Button variant={mode === "manual" ? "primary" : "secondary"} onClick={() => setMode("manual")} style={{ flex: 1 }}>
              Paste transcript
            </Button>
          </div>

          {mode === "bot" ? (
            <>
              <div className={styles.field}>
                <div className={styles.fieldLabel}>Meeting link</div>
                <Input
                  placeholder="Paste a Zoom or Google Meet link"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
                <div className={styles.fieldHint}>The bot joins using only this link, no Zoom or Google account needed.</div>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>
                  Client <span className={styles.fieldOptional}>(optional)</span>
                </div>
                <div className={styles.searchWrap}>
                  <Search className={styles.searchIcon} width={14} height={14} color="var(--ink-3)" strokeWidth={1.8} />
                  <input
                    className={styles.searchInput}
                    placeholder="Search clients…"
                    value={clientQuery}
                    onChange={(e) => setClientQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <div className={styles.fieldLabel}>When</div>
                {!joinNowMode ? (
                  <>
                    <div className={styles.whenGrid}>
                      <input
                        type="date"
                        className={styles.plainInput}
                        value={dateVal}
                        onChange={(e) => setDateVal(e.target.value)}
                      />
                      <input
                        type="time"
                        className={styles.plainInput}
                        value={timeVal}
                        onChange={(e) => setTimeVal(e.target.value)}
                      />
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

              <div className={styles.notice}>
                A bot will join as a participant and capture the transcript. The client will see it in the call.
              </div>
            </>
          ) : (
            <div className={styles.field}>
              <div className={styles.fieldLabel}>Transcript</div>
              <textarea
                className={styles.textarea}
                style={{ height: 160 }}
                placeholder="Paste the meeting transcript text here..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
              />
              <div className={styles.fieldHint}>Processed immediately, no bot or scheduling needed.</div>
            </div>
          )}

          {error && <div className={styles.fieldError}>{error}</div>}

          <div className={styles.footer}>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={submitting}>
              {submitting ? "Working…" : mode === "bot" ? "Schedule bot" : "Process transcript"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
