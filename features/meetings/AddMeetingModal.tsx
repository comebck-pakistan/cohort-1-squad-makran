"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { CalendarPlus, Search, Video } from "lucide-react";
import { scheduleBotMeeting, createManualMeeting } from "@/lib/actions/meetings";
import { createGoogleCalendarEvent, isGoogleCalendarConnected } from "@/lib/actions/calendar";
import type { MeetingRow, ClientRow } from "@/types/db";
import styles from "./AddMeetingModal.module.css";

interface AddMeetingModalProps {
  clients: ClientRow[];
  onClose: () => void;
  onCreated: (meeting: MeetingRow, message: string) => void;
  /** Pre-filled start, used when the modal is opened by clicking a slot in the week grid. */
  initialStart?: Date;
}

type Mode = "bot" | "manual";

/** Local (not UTC) values for the native date and time inputs. */
function dateInputValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function timeInputValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Next full hour, so the default is always a sane future slot rather than a fixed date. */
function nextHour(): Date {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  return start;
}

export function AddMeetingModal({ clients, onClose, onCreated, initialStart }: AddMeetingModalProps) {
  const [defaultStart] = useState(() => initialStart ?? nextHour());
  const [mode, setMode] = useState<Mode>("bot");
  const [title, setTitle] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [transcript, setTranscript] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [dateVal, setDateVal] = useState(() => dateInputValue(defaultStart));
  const [timeVal, setTimeVal] = useState(() => timeInputValue(defaultStart));
  const [joinNowMode, setJoinNowMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  // Default on once we know the calendar is connected: creating the event is the frictionless path.
  const [createInCalendar, setCreateInCalendar] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    let live = true;
    void isGoogleCalendarConnected().then((connected) => {
      if (!live) return;
      setCalendarConnected(connected);
      setCreateInCalendar(connected);
    });
    return () => {
      live = false;
    };
  }, []);

  const willCreateEvent = mode === "bot" && calendarConnected && createInCalendar && !joinNowMode;

  const clientMatches =
    clientQuery.trim() && !selectedClientId
      ? clients.filter((c) => c.name.toLowerCase().includes(clientQuery.trim().toLowerCase())).slice(0, 6)
      : [];

  function selectClient(client: ClientRow) {
    setSelectedClientId(client.id);
    setClientQuery(client.name);
  }

  function clearClient() {
    setSelectedClientId(null);
    setClientQuery("");
  }

  function clientPickerField() {
    return (
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
            onChange={(e) => {
              setSelectedClientId(null);
              setClientQuery(e.target.value);
            }}
          />
          {selectedClientId && (
            <button type="button" className={styles.clearClientBtn} onClick={clearClient} aria-label="Clear client">
              ×
            </button>
          )}
          {clientMatches.length > 0 && (
            <div className={styles.searchResults}>
              {clientMatches.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  className={styles.searchResultItem}
                  onClick={() => selectClient(c)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
        {clientQuery.trim() && !selectedClientId && clientMatches.length === 0 && (
          <div className={styles.fieldHint}>No matching client. Meeting will be added with no client attached.</div>
        )}
      </div>
    );
  }

  async function submit() {
    if (!title.trim()) {
      setError("Add a title before scheduling.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "bot") {
        if (!willCreateEvent && !meetingLink.trim()) {
          setError("Add a meeting link, or let Solvo create the event and generate one.");
          setSubmitting(false);
          return;
        }
        const startsAt = joinNowMode ? new Date().toISOString() : new Date(`${dateVal}T${timeVal}`).toISOString();

        let meetingUrl = meetingLink.trim();
        let googleEventId: string | null = null;

        if (willCreateEvent && !meetingUrl) {
          const created = await createGoogleCalendarEvent({
            title: title.trim(),
            startsAtISO: startsAt,
            durationMinutes,
            attendeeEmails: inviteEmail.trim() ? [inviteEmail.trim()] : [],
          });
          if (!created.videoLink) {
            setError("Google created the event but returned no Meet link. Paste a link instead.");
            setSubmitting(false);
            return;
          }
          meetingUrl = created.videoLink;
          googleEventId = created.googleEventId;
        }

        const meeting = await scheduleBotMeeting({
          title: title.trim(),
          meetingUrl,
          clientId: selectedClientId,
          guestEmail: inviteEmail.trim() || null,
          startsAt,
          googleEventId,
        });
        onCreated(
          meeting,
          joinNowMode
            ? "Bot joining now."
            : googleEventId
              ? `Event created on your calendar, bot scheduled for ${dateVal} at ${timeVal}.`
              : `Bot scheduled for ${dateVal} at ${timeVal}.`
        );
      } else {
        if (!transcript.trim()) {
          setError("Paste the transcript text before continuing.");
          setSubmitting(false);
          return;
        }
        const meeting = await createManualMeeting({
          title: title.trim(),
          transcript,
          clientId: selectedClientId,
          startsAt: new Date().toISOString(),
        });
        onCreated(meeting, "Transcript received, drafting tickets.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.startsWith("google_calendar_write_denied")) {
        // The stored grant predates the write scope, so reconnecting is the actual fix.
        setError("Solvo cannot write to your calendar yet. Reconnect Google Calendar in Settings → Integrations.");
      } else if (message.startsWith("google_calendar_create_failed")) {
        setError("Google would not create the event. Paste a meeting link instead, or try again.");
      } else {
        setError(
          mode === "bot" ? "Could not schedule the bot. Check Skribby is configured." : "Could not process the transcript."
        );
      }
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
              {calendarConnected && !joinNowMode && (
                <div className={styles.field}>
                  <label className={styles.optionRow}>
                    <input
                      type="checkbox"
                      checked={createInCalendar}
                      onChange={(e) => setCreateInCalendar(e.target.checked)}
                    />
                    <CalendarPlus width={15} height={15} strokeWidth={1.8} />
                    <span>
                      Create this on my Google Calendar
                      <span className={styles.optionNote}>Solvo generates the Meet link and invites the guest.</span>
                    </span>
                  </label>
                </div>
              )}

              <div className={styles.field}>
                <div className={styles.fieldLabel}>
                  Meeting link {willCreateEvent && <span className={styles.fieldOptional}>(optional)</span>}
                </div>
                <Input
                  placeholder={willCreateEvent ? "Leave empty to generate a Meet link" : "Paste a Zoom or Google Meet link"}
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
                <div className={[styles.fieldHint, styles.hintWithIcon].join(" ")}>
                  {willCreateEvent && !meetingLink.trim() ? (
                    <>
                      <Video width={12} height={12} strokeWidth={1.8} /> A Google Meet link is created with the event.
                      Paste your own link here to use that instead.
                    </>
                  ) : (
                    "The bot joins using only this link, no Zoom or Google account needed."
                  )}
                </div>
              </div>

              {willCreateEvent && (
                <div className={styles.field}>
                  <div className={styles.fieldLabel}>
                    Invite <span className={styles.fieldOptional}>(optional)</span>
                  </div>
                  <Input
                    placeholder="guest@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <div className={styles.fieldHint}>
                    Google emails them the invite. A match on file for a client also links this meeting to them.
                  </div>
                </div>
              )}

              {clientPickerField()}

              <div className={styles.field}>
                <div className={styles.fieldLabel}>When</div>
                {!joinNowMode ? (
                  <>
                    <div className={[styles.whenGrid, willCreateEvent ? styles.whenGridWide : ""].join(" ")}>
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
                      {willCreateEvent && (
                        <select
                          className={styles.plainInput}
                          value={durationMinutes}
                          onChange={(e) => setDurationMinutes(Number(e.target.value))}
                          aria-label="Duration"
                        >
                          <option value={15}>15 min</option>
                          <option value={30}>30 min</option>
                          <option value={45}>45 min</option>
                          <option value={60}>1 hour</option>
                          <option value={90}>1.5 hours</option>
                        </select>
                      )}
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
            <>
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
              {clientPickerField()}
            </>
          )}

          {error && <div className={styles.fieldError}>{error}</div>}

          <div className={styles.footer}>
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={submitting}>
              {submitting
                ? "Working…"
                : mode === "manual"
                  ? "Process transcript"
                  : willCreateEvent && !meetingLink.trim()
                    ? "Create event & schedule bot"
                    : "Schedule bot"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
