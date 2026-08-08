import { NonRetriableError } from "inngest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateIntegration } from "@/lib/db/integrations";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
// openid + email are what userinfo needs to label the card with the connected account.
// calendar.readonly covers the sync and the week grid; calendar.events is what lets Solvo put a
// real event (with a real Meet link) on the calendar instead of asking for a pasted link.
const SCOPE = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

function clientId(): string {
  const id = process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID;
  if (!id) throw new Error("google_oauth_not_configured");
  return id;
}

function clientSecret(): string {
  const secret = process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET;
  if (!secret) throw new Error("google_oauth_not_configured");
  return secret;
}

function redirectUri(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${appUrl}/api/google-calendar/oauth/callback`;
}

export function getAuthUrl(state: string): string {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export interface TokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresInSec: number;
}

export async function exchangeCode(code: string): Promise<TokenSet> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId(),
      client_secret: clientSecret(),
      code,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(`google_token_exchange_failed: ${data.error ?? res.status}`);
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresInSec: data.expires_in ?? 3600,
  };
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresInSec: number }> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId(),
      client_secret: clientSecret(),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) {
    throw new NonRetriableError(`google_auth_failed: refresh failed (${data.error ?? res.status})`);
  }
  return { accessToken: data.access_token, expiresInSec: data.expires_in ?? 3600 };
}

/** Best-effort revoke at Google so a disconnect really ends access, not just forgets the token locally. */
export async function revokeToken(token: string): Promise<void> {
  try {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
  } catch {
    // Already-invalid or unreachable: the local disconnect below still stands.
  }
}

export async function getUserEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`google_userinfo_failed: ${res.status}`);
  const data = (await res.json()) as { email?: string };
  if (!data.email) throw new Error("google_userinfo_failed: no email in response");
  return data.email;
}

/** Valid (auto-refreshed if needed) access token for `ownerId`'s connected calendar, or null if never connected. */
export async function getGoogleCalendarAccessToken(
  supabase: SupabaseClient,
  ownerId: string
): Promise<string | null> {
  const { data: integration, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("category", "calendar")
    .eq("provider", "google_calendar")
    .eq("status", "connected")
    .maybeSingle();
  if (error) throw error;
  if (!integration?.access_token) return null;

  const expiresAt = integration.token_expires_at ? new Date(integration.token_expires_at).getTime() : 0;
  const expiringSoon = expiresAt - Date.now() < 2 * 60 * 1000;

  if (!expiringSoon) return decryptSecret(integration.access_token);

  if (!integration.refresh_token) {
    throw new NonRetriableError("google_auth_failed: token expired and no refresh token stored.");
  }
  const refreshed = await refreshAccessToken(decryptSecret(integration.refresh_token));
  await updateIntegration(supabase, integration.id, {
    access_token: encryptSecret(refreshed.accessToken),
    token_expires_at: new Date(Date.now() + refreshed.expiresInSec * 1000).toISOString(),
  });
  return refreshed.accessToken;
}

export interface CreatedEvent {
  googleEventId: string;
  videoLink: string | null;
  htmlLink: string | null;
}

/**
 * Creates a real event on the user's primary calendar, with a Google Meet link attached, so the
 * user never has to leave Solvo to set up a call. Requires the `calendar.events` scope.
 */
export async function createCalendarEvent(
  accessToken: string,
  input: {
    title: string;
    startsAtISO: string;
    endsAtISO: string;
    attendeeEmails?: string[];
    description?: string;
    requestId: string;
  }
): Promise<CreatedEvent> {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  // Version 1 is what makes Google actually mint the Meet link instead of ignoring conferenceData.
  url.searchParams.set("conferenceDataVersion", "1");
  if (input.attendeeEmails?.length) url.searchParams.set("sendUpdates", "all");

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      summary: input.title,
      description: input.description,
      start: { dateTime: input.startsAtISO },
      end: { dateTime: input.endsAtISO },
      attendees: (input.attendeeEmails ?? []).map((email) => ({ email })),
      conferenceData: {
        createRequest: {
          requestId: input.requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    }),
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error("google_calendar_write_denied: reconnect Google Calendar to grant event access.");
  }
  if (!res.ok) throw new Error(`google_calendar_create_failed: ${res.status} ${await res.text()}`);

  const created = (await res.json()) as GoogleEvent & { htmlLink?: string };
  return {
    googleEventId: created.id,
    videoLink: videoLinkOf(created),
    htmlLink: created.htmlLink ?? null,
  };
}

export interface DetectedEvent {
  googleEventId: string;
  title: string;
  startsAt: string;
  videoLink: string;
  attendeeEmails: string[];
}

interface GoogleEvent {
  id: string;
  status: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  hangoutLink?: string;
  location?: string;
  conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
  attendees?: { email: string; self?: boolean; responseStatus?: string }[];
}

async function fetchRawEvents(
  accessToken: string,
  range: { timeMinISO: string; timeMaxISO: string },
  maxResults: number
): Promise<GoogleEvent[]> {
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", range.timeMinISO);
  url.searchParams.set("timeMax", range.timeMaxISO);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", String(maxResults));

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401) throw new NonRetriableError("google_auth_failed: calendar token rejected.");
  if (!res.ok) throw new Error(`google_calendar_list_failed: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as { items?: GoogleEvent[] };
  return data.items ?? [];
}

/** One entry per calendar event in the range, video call or not: this is what the week grid draws. */
export interface CalendarEntry {
  googleEventId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  videoLink: string | null;
  location: string | null;
  attendeeEmails: string[];
  declined: boolean;
}

/** Everything on the primary calendar between two instants, for display only. */
export async function listCalendarEntries(
  accessToken: string,
  range: { timeMinISO: string; timeMaxISO: string }
): Promise<CalendarEntry[]> {
  const items = await fetchRawEvents(accessToken, range, 250);
  const entries: CalendarEntry[] = [];

  for (const event of items) {
    if (event.status === "cancelled") continue;
    const startsAt = event.start?.dateTime ?? event.start?.date;
    if (!startsAt) continue;
    const allDay = !event.start?.dateTime;
    // Google omits end on rare malformed events. An hour is a sane fallback for a drawn block.
    const endsAt =
      event.end?.dateTime ??
      event.end?.date ??
      new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();
    const self = event.attendees?.find((a) => a.self);

    entries.push({
      googleEventId: event.id,
      title: event.summary ?? "Untitled event",
      startsAt,
      endsAt,
      allDay,
      videoLink: videoLinkOf(event),
      location: event.location ?? null,
      attendeeEmails: (event.attendees ?? []).filter((a) => !a.self).map((a) => a.email),
      declined: self?.responseStatus === "declined",
    });
  }
  return entries;
}

function videoLinkOf(event: GoogleEvent): string | null {
  if (event.hangoutLink) return event.hangoutLink;
  const entry = event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video");
  return entry?.uri ?? null;
}

export async function listUpcomingEvents(
  accessToken: string,
  range: { timeMinISO: string; timeMaxISO: string }
): Promise<DetectedEvent[]> {
  const items = await fetchRawEvents(accessToken, range, 50);
  const events: DetectedEvent[] = [];
  for (const event of items) {
    if (event.status === "cancelled") continue;
    if (!event.start?.dateTime) continue;
    const self = event.attendees?.find((a) => a.self);
    if (self?.responseStatus === "declined") continue;
    const videoLink = videoLinkOf(event);
    if (!videoLink) continue;
    events.push({
      googleEventId: event.id,
      title: event.summary ?? "Untitled event",
      startsAt: event.start.dateTime,
      videoLink,
      attendeeEmails: (event.attendees ?? []).filter((a) => !a.self).map((a) => a.email),
    });
  }
  return events;
}
