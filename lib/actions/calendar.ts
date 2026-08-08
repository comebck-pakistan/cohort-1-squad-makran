"use server";

import { createClient } from "@/lib/supabase/server";
import { listIntegrations, updateIntegration } from "@/lib/db/integrations";
import { randomUUID } from "crypto";
import {
  revokeToken,
  getGoogleCalendarAccessToken,
  listCalendarEntries,
  createCalendarEvent,
  type CalendarEntry,
  type CreatedEvent,
} from "@/lib/google-calendar";
import { decryptSecret } from "@/lib/crypto";

async function requireOwnerId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, ownerId: user.id };
}

export interface CalendarWeek {
  connected: boolean;
  entries: CalendarEntry[];
  error: string | null;
}

/**
 * Live read of the connected Google Calendar for one week, so the Meetings screen can show a real
 * week grid without the user leaving the app. Read-only: nothing here creates meetings or bots.
 */
export async function fetchCalendarWeek(rangeStartISO: string, rangeEndISO: string): Promise<CalendarWeek> {
  const { supabase, ownerId } = await requireOwnerId();

  let token: string | null;
  try {
    token = await getGoogleCalendarAccessToken(supabase, ownerId);
  } catch {
    // Stored grant no longer works. The card in Settings is where reconnecting happens.
    return { connected: true, entries: [], error: "Google rejected the saved calendar access. Reconnect in Settings." };
  }
  if (!token) return { connected: false, entries: [], error: null };

  try {
    const entries = await listCalendarEntries(token, { timeMinISO: rangeStartISO, timeMaxISO: rangeEndISO });
    return { connected: true, entries, error: null };
  } catch (err) {
    return {
      connected: true,
      entries: [],
      error: err instanceof Error ? err.message : "Could not read the calendar.",
    };
  }
}

/** Whether this user has a usable Google Calendar grant right now, for UI that offers to write to it. */
export async function isGoogleCalendarConnected(): Promise<boolean> {
  const { supabase, ownerId } = await requireOwnerId();
  try {
    return (await getGoogleCalendarAccessToken(supabase, ownerId)) !== null;
  } catch {
    return false;
  }
}

/**
 * Puts a real event on the user's primary calendar and returns its Meet link, so scheduling a
 * meeting in Solvo does not mean going to Google Calendar first to make one and paste the link back.
 */
export async function createGoogleCalendarEvent(input: {
  title: string;
  startsAtISO: string;
  durationMinutes: number;
  attendeeEmails?: string[];
}): Promise<CreatedEvent> {
  const { supabase, ownerId } = await requireOwnerId();
  const token = await getGoogleCalendarAccessToken(supabase, ownerId);
  if (!token) throw new Error("Google Calendar is not connected.");

  const endsAtISO = new Date(new Date(input.startsAtISO).getTime() + input.durationMinutes * 60_000).toISOString();
  return createCalendarEvent(token, {
    title: input.title,
    startsAtISO: input.startsAtISO,
    endsAtISO,
    attendeeEmails: input.attendeeEmails?.filter(Boolean),
    description: "Scheduled from Solvo. A note-taking bot will join and capture the transcript.",
    requestId: randomUUID(),
  });
}

export async function disconnectGoogleCalendar(): Promise<void> {
  const { supabase } = await requireOwnerId();
  const integration = (await listIntegrations(supabase)).find(
    (i) => i.category === "calendar" && i.provider === "google_calendar"
  );
  if (!integration) return;

  // Revoking the refresh token kills the whole grant (access token included) on Google's side.
  const stored = integration.refresh_token ?? integration.access_token;
  if (stored) await revokeToken(decryptSecret(stored));

  await updateIntegration(supabase, integration.id, {
    status: "disconnected",
    connected_at: null,
    access_token: null,
    refresh_token: null,
    token_expires_at: null,
  });
}
