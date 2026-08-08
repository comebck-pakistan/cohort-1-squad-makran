"use server";

import { createClient } from "@/lib/supabase/server";
import { createMeeting, updateMeeting, listMeetings, getMeeting } from "@/lib/db/meetings";
import { findClientContactByEmail } from "@/lib/db/client-contacts";
import { createTicket } from "@/lib/db/tickets";
import { createSkribbyBot } from "@/lib/skribby";
import { ensureClientRepo } from "@/lib/actions/client-repos";
import { inngest } from "@/inngest/client";
import type { MeetingRow } from "@/types/db";

async function requireOwnerId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, ownerId: user.id };
}

/** Smart auto-join: bot only sent automatically for emails already on file for a known client. */
async function resolveKnownClient(supabase: Awaited<ReturnType<typeof createClient>>, guestEmail: string | null) {
  if (!guestEmail) return { knownClient: false, clientId: null as string | null };
  const contact = await findClientContactByEmail(supabase, guestEmail);
  return { knownClient: Boolean(contact), clientId: contact?.client_id ?? null };
}

export interface ScheduleBotMeetingInput {
  title: string;
  meetingUrl: string;
  clientId: string | null;
  guestEmail: string | null;
  startsAt: string;
  /** Set when Solvo created the Google Calendar event itself, so `calendar-sync` dedupes on it
   * instead of treating the same event as new and sending a second bot. */
  googleEventId?: string | null;
}

/** Skribby bot-join path. Requires SKRIBBY_API_KEY, real Skribby account. */
export async function scheduleBotMeeting(input: ScheduleBotMeetingInput): Promise<MeetingRow> {
  const { supabase, ownerId } = await requireOwnerId();
  const { knownClient: emailKnownClient, clientId: emailClientId } = await resolveKnownClient(
    supabase,
    input.guestEmail
  );
  // A client picked directly in the modal is just as "known" as one resolved from the guest email.
  const knownClient = Boolean(input.clientId) || emailKnownClient;

  const bot = await createSkribbyBot({ meetingUrl: input.meetingUrl });

  const meeting = await createMeeting(supabase, {
    owner_id: ownerId,
    client_id: input.clientId ?? emailClientId,
    title: input.title,
    source: "bot_skribby",
    transcript_source: null,
    status: "scheduled",
    failure_reason: null,
    skribby_bot_id: bot.id,
    draft_tickets: [],
    starts_at: input.startsAt,
    known_client: knownClient,
    guest_email: input.guestEmail,
    transcript_text: null,
    google_event_id: input.googleEventId ?? null,
    meeting_url: input.meetingUrl,
  });

  if (knownClient) {
    await inngest.send({ name: "meeting/confirmed", data: { meetingId: meeting.id } });
  }

  return meeting;
}

export interface CreateManualMeetingInput {
  title: string;
  transcript: string;
  clientId: string | null;
  startsAt: string;
}

/** Manual paste path: transcript is already known, so processing starts immediately, no bot wait. */
export async function createManualMeeting(input: CreateManualMeetingInput): Promise<MeetingRow> {
  const { supabase, ownerId } = await requireOwnerId();

  const meeting = await createMeeting(supabase, {
    owner_id: ownerId,
    client_id: input.clientId,
    title: input.title,
    source: "manual_paste",
    transcript_source: "manual",
    status: "processing",
    failure_reason: null,
    skribby_bot_id: null,
    draft_tickets: [],
    starts_at: input.startsAt,
    known_client: Boolean(input.clientId),
    guest_email: null,
    transcript_text: null,
    google_event_id: null,
    meeting_url: null,
  });

  await inngest.send({
    name: "meeting/ready-for-processing",
    data: { meetingId: meeting.id, transcript: input.transcript },
  });

  return meeting;
}

export async function fetchMeetings(): Promise<MeetingRow[]> {
  const { supabase } = await requireOwnerId();
  return listMeetings(supabase);
}

export interface DraftTicketEdit {
  title: string;
  body: string;
  repoId: string | null;
}

/**
 * Human-confirm gate (handoff hard rule): draft tickets only become real `tickets` rows here,
 * on explicit user confirmation. Clears `draft_tickets` once promoted.
 */
export async function promoteDraftTickets(
  meetingId: string,
  clientId: string | null,
  tickets: DraftTicketEdit[]
): Promise<void> {
  const { supabase, ownerId } = await requireOwnerId();

  // Known client: repo is fully automatic (created once, reused after), no manual repo pick.
  // Unknown client: there's nothing to hang a repo off of, keep the caller's manual choice.
  let repoId: string | null = null;
  let usedAutoRepo = false;
  if (clientId) {
    const { data: client, error } = await supabase.from("clients").select("name").eq("id", clientId).single();
    if (error) throw error;
    const repo = await ensureClientRepo(clientId, client.name);
    repoId = repo.id;
    usedAutoRepo = true;
  }

  for (const t of tickets) {
    const ticket = await createTicket(supabase, {
      owner_id: ownerId,
      client_id: clientId,
      repo_id: usedAutoRepo ? repoId : t.repoId,
      title: t.title,
      plan_summary: t.body,
      failure_reason: null,
      state: "agent_running",
      pr_url: null,
      attempt_count: 0,
    });
    // Gate removed: assigning the agent is a no-decision "go" click, plan approval right
    // after is the real safety checkpoint (agent hasn't touched the repo yet at this point).
    await inngest.send({ name: "ticket/state-changed", data: { ticketId: ticket.id, state: "agent_running" } });
    await inngest.send({ name: "ticket/agent-assigned", data: { ticketId: ticket.id } });
  }

  await updateMeeting(supabase, meetingId, { draft_tickets: [] });
}

export async function discardDraftTickets(meetingId: string): Promise<void> {
  const { supabase } = await requireOwnerId();
  await updateMeeting(supabase, meetingId, { draft_tickets: [] });
}

/** Real confirm for a calendar-detected suggestion: the bot hasn't been sent yet, this is the first time it is. */
export async function confirmCalendarSuggestion(meetingId: string): Promise<void> {
  const { supabase } = await requireOwnerId();
  const meeting = await getMeeting(supabase, meetingId);
  if (!meeting) throw new Error("Meeting not found.");
  if (meeting.known_client || meeting.skribby_bot_id) return;
  if (!meeting.meeting_url) throw new Error("This meeting has no video link to send a bot to.");

  const bot = await createSkribbyBot({ meetingUrl: meeting.meeting_url });
  await updateMeeting(supabase, meetingId, { skribby_bot_id: bot.id });
}

export async function dismissCalendarSuggestion(meetingId: string): Promise<void> {
  const { supabase } = await requireOwnerId();
  await updateMeeting(supabase, meetingId, { status: "dismissed" });
}
