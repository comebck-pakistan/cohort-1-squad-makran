"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  TriangleAlert,
  Users,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fetchCalendarWeek } from "@/lib/actions/calendar";
import type { CalendarEntry } from "@/lib/google-calendar";
import type { MeetingRow } from "@/types/db";
import styles from "./CalendarWeekView.module.css";

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const HOUR_HEIGHT = 52;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Local midnight of the Monday that starts `date`'s week (Sunday closes the week, not opens it). */
function weekStartOf(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function hourLabel(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
}

function clockLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

interface PositionedEntry {
  entry: CalendarEntry;
  top: number;
  height: number;
  column: number;
  columns: number;
}

/**
 * Lays out one day's timed entries: overlapping blocks split the column width between them,
 * the way every calendar grid does it.
 */
function layoutDay(entries: CalendarEntry[], dayStart: Date): PositionedEntry[] {
  const dayStartMs = dayStart.getTime();
  const sorted = [...entries].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const placed: PositionedEntry[] = sorted.map((entry) => {
    const startMs = Math.max(new Date(entry.startsAt).getTime(), dayStartMs);
    const endMs = Math.min(new Date(entry.endsAt).getTime(), dayStartMs + DAY_MS);
    const startMin = (startMs - dayStartMs) / 60_000;
    // A 20-minute floor keeps very short events readable instead of a hairline.
    const durationMin = Math.max((endMs - startMs) / 60_000, 20);
    return {
      entry,
      top: (startMin / 60) * HOUR_HEIGHT,
      height: (durationMin / 60) * HOUR_HEIGHT,
      column: 0,
      columns: 1,
    };
  });

  // Group anything that visually overlaps, then hand each member its own slot in that group.
  let group: PositionedEntry[] = [];
  let groupEnd = -Infinity;
  const flush = () => {
    group.forEach((item, index) => {
      item.column = index;
      item.columns = group.length;
    });
    group = [];
    groupEnd = -Infinity;
  };

  for (const item of placed) {
    if (group.length > 0 && item.top >= groupEnd) flush();
    group.push(item);
    groupEnd = Math.max(groupEnd, item.top + item.height);
  }
  flush();

  return placed;
}

interface CalendarWeekViewProps {
  meetings: MeetingRow[];
  /** Bumped by the screen's single Refresh button so the week reloads with the rest of the page. */
  refreshKey: number;
  /** Click on an empty slot: the screen opens the Add meeting modal starting at that time. */
  onSlotClick: (start: Date) => void;
}

export function CalendarWeekView({ meetings, refreshKey, onSlotClick }: CalendarWeekViewProps) {
  const [weekStart, setWeekStart] = useState<Date | null>(null);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [selected, setSelected] = useState<CalendarEntry | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Both the week and the now-line depend on the client clock, so they are set after mount.
  useEffect(() => {
    const start = setTimeout(() => {
      setNow(new Date());
      setWeekStart(weekStartOf(new Date()));
    }, 0);
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
    };
  }, []);

  const load = useCallback(async (start: Date) => {
    setLoading(true);
    setError(null);
    try {
      const week = await fetchCalendarWeek(start.toISOString(), addDays(start, 7).toISOString());
      setConnected(week.connected);
      setEntries(week.entries);
      setError(week.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the calendar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!weekStart) return;
    const fetchWeek = setTimeout(() => void load(weekStart), 0);
    return () => clearTimeout(fetchWeek);
  }, [weekStart, load, refreshKey]);

  // Open on the working day, not on midnight.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7.5 * HOUR_HEIGHT;
  }, [weekStart]);

  const days = useMemo(
    () => (weekStart ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : []),
    [weekStart]
  );

  // Events the app is already tracking get a marker, so the grid shows what has a bot on it.
  const trackedIds = useMemo(() => {
    const map = new Map<string, MeetingRow>();
    for (const m of meetings) if (m.google_event_id) map.set(m.google_event_id, m);
    return map;
  }, [meetings]);

  const byDay = useMemo(() => {
    return days.map((day) => {
      const dayStart = new Date(day);
      const dayEnd = addDays(dayStart, 1);
      const timed = entries.filter((e) => {
        if (e.allDay) return false;
        const start = new Date(e.startsAt);
        const end = new Date(e.endsAt);
        return start < dayEnd && end > dayStart;
      });
      const allDay = entries.filter((e) => {
        if (!e.allDay) return false;
        // All-day values are plain dates, so compare them as local calendar days.
        const start = new Date(`${e.startsAt}T00:00:00`);
        const end = new Date(`${e.endsAt}T00:00:00`);
        return start < dayEnd && end > dayStart;
      });
      return { day, timed: layoutDay(timed, dayStart), allDay };
    });
  }, [days, entries]);

  const rangeLabel = useMemo(() => {
    if (!weekStart) return "";
    const end = addDays(weekStart, 6);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    const sameMonth = weekStart.getMonth() === end.getMonth();
    const left = weekStart.toLocaleDateString("en-US", opts);
    const right = end.toLocaleDateString("en-US", sameMonth ? { day: "numeric" } : opts);
    return `${left} – ${right}, ${end.getFullYear()}`;
  }, [weekStart]);

  const isThisWeek = Boolean(now && weekStart && now >= weekStart && now < addDays(weekStart, 7));

  if (!weekStart) {
    return (
      <div className={styles.placeholder}>
        <Loader2 className={styles.spin} width={16} height={16} strokeWidth={1.8} />
        Loading your week…
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.navGroup}>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              aria-label="Previous week"
            >
              <ChevronLeft width={16} height={16} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              className={styles.navBtn}
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              aria-label="Next week"
            >
              <ChevronRight width={16} height={16} strokeWidth={1.8} />
            </button>
          </div>
          <div className={styles.rangeLabel}>{rangeLabel}</div>
          {!isThisWeek && (
            <button type="button" className={styles.todayBtn} onClick={() => setWeekStart(weekStartOf(new Date()))}>
              Today
            </button>
          )}
          {loading && (
            <span className={styles.loadingTag}>
              <Loader2 className={styles.spin} width={13} height={13} strokeWidth={1.8} />
              Syncing
            </span>
          )}
        </div>
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={[styles.swatch, styles.eventBot].join(" ")} /> Bot scheduled
          </span>
          <span className={styles.legendItem}>
            <span className={[styles.swatch, styles.eventVideo].join(" ")} /> Video call
          </span>
          <span className={styles.legendItem}>
            <span className={[styles.swatch, styles.eventPlain].join(" ")} /> Other
          </span>
        </div>
      </div>

      {!connected && (
        <div className={styles.notice}>
          <TriangleAlert width={15} height={15} strokeWidth={1.8} />
          <span>
            Google Calendar is not connected, so this week is empty. Connect it in Settings → Integrations. You can
            still click any slot below to add a meeting by hand.
          </span>
        </div>
      )}

      {error && (
        <div className={styles.notice}>
          <TriangleAlert width={15} height={15} strokeWidth={1.8} />
          <span>{error}</span>
        </div>
      )}

      <div className={styles.grid}>
        <div className={styles.headRow}>
          <div className={styles.gutterHead}>TIME</div>
          {byDay.map(({ day, allDay }) => (
            <div key={day.toISOString()} className={styles.dayHead}>
              <div className={styles.dayLabel}>
                {DAY_LABELS[day.getDay()]}
                <span className={now && sameDay(day, now) ? styles.dayNumToday : styles.dayNum}>{day.getDate()}</span>
              </div>
              {allDay.map((e) => (
                <div key={e.googleEventId} className={styles.allDayChip} title={e.title}>
                  {e.title}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className={styles.scroller} ref={scrollRef}>
          <div className={styles.body} style={{ height: 24 * HOUR_HEIGHT }}>
            <div className={styles.gutter}>
              {Array.from({ length: 24 }, (_, hour) => (
                <div key={hour} className={styles.hourLabel} style={{ height: HOUR_HEIGHT }}>
                  {hour === 0 ? "" : hourLabel(hour)}
                </div>
              ))}
            </div>

            {byDay.map(({ day, timed }) => (
              <div key={day.toISOString()} className={styles.dayCol}>
                {Array.from({ length: 24 }, (_, hour) => {
                  const slot = new Date(day);
                  slot.setHours(hour, 0, 0, 0);
                  return (
                    <button
                      key={hour}
                      type="button"
                      className={styles.hourCell}
                      style={{ height: HOUR_HEIGHT }}
                      onClick={() => onSlotClick(slot)}
                      aria-label={`Add a meeting on ${day.toDateString()} at ${hourLabel(hour)}`}
                    >
                      <span className={styles.slotHint}>
                        <Plus width={12} height={12} strokeWidth={2} />
                        {hourLabel(hour)}
                      </span>
                    </button>
                  );
                })}

                {isThisWeek && now && sameDay(day, now) && (
                  <div
                    className={styles.nowLine}
                    style={{ top: ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT }}
                  />
                )}

                {timed.map(({ entry, top, height, column, columns }) => {
                  const tracked = trackedIds.get(entry.googleEventId);
                  const hasBot = Boolean(tracked?.skribby_bot_id);
                  const kind = entry.declined
                    ? styles.eventDeclined
                    : hasBot
                      ? styles.eventBot
                      : entry.videoLink
                        ? styles.eventVideo
                        : styles.eventPlain;
                  return (
                    <button
                      key={entry.googleEventId}
                      type="button"
                      className={[styles.event, kind].join(" ")}
                      style={{
                        top,
                        height,
                        left: `calc(${(column / columns) * 100}% + 4px)`,
                        width: `calc(${100 / columns}% - 8px)`,
                      }}
                      onClick={() => setSelected(entry)}
                    >
                      <span className={styles.eventTitle}>
                        {hasBot ? (
                          <Bot width={12} height={12} strokeWidth={1.8} className={styles.eventIcon} />
                        ) : entry.videoLink ? (
                          <Video width={12} height={12} strokeWidth={1.8} className={styles.eventIcon} />
                        ) : null}
                        {entry.title}
                      </span>
                      <span className={styles.eventTime}>{clockLabel(entry.startsAt)}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <div className={styles.overlay} onClick={() => setSelected(null)}>
          <div className={styles.detail} onClick={(e) => e.stopPropagation()}>
            <div className={styles.detailHead}>
              <div className={styles.detailTitle}>{selected.title}</div>
              <button type="button" className={styles.detailClose} onClick={() => setSelected(null)} aria-label="Close">
                <X width={16} height={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className={styles.detailMeta}>
              {new Date(selected.startsAt).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
              {" · "}
              {selected.allDay ? "All day" : `${clockLabel(selected.startsAt)} – ${clockLabel(selected.endsAt)}`}
            </div>

            {selected.location && (
              <div className={styles.detailRow}>
                <MapPin width={14} height={14} strokeWidth={1.8} />
                <span>{selected.location}</span>
              </div>
            )}
            {selected.attendeeEmails.length > 0 && (
              <div className={styles.detailRow}>
                <Users width={14} height={14} strokeWidth={1.8} />
                <span>{selected.attendeeEmails.join(", ")}</span>
              </div>
            )}
            {trackedIds.get(selected.googleEventId)?.skribby_bot_id && (
              <div className={styles.detailRow}>
                <Bot width={14} height={14} strokeWidth={1.8} />
                <span>A note-taking bot is scheduled to join this call.</span>
              </div>
            )}

            <div className={styles.detailActions}>
              {selected.videoLink && (
                <a href={selected.videoLink} target="_blank" rel="noreferrer" className={styles.joinLink}>
                  <Video width={14} height={14} strokeWidth={1.8} />
                  Join call
                  <ExternalLink width={12} height={12} strokeWidth={1.8} />
                </a>
              )}
              {!trackedIds.has(selected.googleEventId) && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    onSlotClick(new Date(selected.startsAt));
                    setSelected(null);
                  }}
                >
                  <CalendarPlus width={14} height={14} strokeWidth={1.8} />
                  Add to Solvo
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
