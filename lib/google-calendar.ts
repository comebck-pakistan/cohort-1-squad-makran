import { NonRetriableError } from "inngest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listIntegrations, updateIntegration } from "@/lib/db/integrations";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

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
  const integration = (await listIntegrations(supabase)).find(
    (i) => i.owner_id === ownerId && i.category === "calendar" && i.provider === "google_calendar" && i.status === "connected"
  );
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
  start?: { dateTime?: string };
  hangoutLink?: string;
  conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
  attendees?: { email: string; self?: boolean; responseStatus?: string }[];
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
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
  url.searchParams.set("timeMin", range.timeMinISO);
  url.searchParams.set("timeMax", range.timeMaxISO);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", "50");

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401) throw new NonRetriableError("google_auth_failed: calendar token rejected.");
  if (!res.ok) throw new Error(`google_calendar_list_failed: ${res.status} ${await res.text()}`);

  const data = (await res.json()) as { items?: GoogleEvent[] };
  const events: DetectedEvent[] = [];
  for (const event of data.items ?? []) {
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
