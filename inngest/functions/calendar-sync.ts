import { inngest, type CalendarConnected } from "@/inngest/client";
import { createServiceClient } from "@/lib/supabase/service";
import { getGoogleCalendarAccessToken, listUpcomingEvents } from "@/lib/google-calendar";
import { createMeeting } from "@/lib/db/meetings";
import { updateIntegration } from "@/lib/db/integrations";
import { createSkribbyBot } from "@/lib/skribby";

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Polls each connected Google Calendar for upcoming events with a video link, creates a real
 * `meetings` row per new event (deduped on google_event_id), auto-sends the bot for known-client
 * matches, leaves unknown-contact events as a real pending suggestion otherwise (docs/features.md §4.7).
 * Runs on a 10-minute cron for everyone, plus once immediately (scoped to one owner) right after connect.
 */
export const calendarSync = inngest.createFunction(
  { id: "calendar-sync", triggers: [{ cron: "*/10 * * * *" }, { event: "calendar/connected" }] },
  async ({ event, step }) => {
    const supabase: ServiceClient = createServiceClient();
    const connectedOwnerId = event?.name === "calendar/connected" ? (event.data as CalendarConnected).ownerId : null;

    const integrations = await step.run("load-connected-calendars", async () => {
      let query = supabase
        .from("integrations")
        .select("*")
        .eq("category", "calendar")
        .eq("provider", "google_calendar")
        .eq("status", "connected");
      if (connectedOwnerId) query = query.eq("owner_id", connectedOwnerId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    });

    const now = new Date();
    const timeMinISO = now.toISOString();
    const timeMaxISO = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    let createdCount = 0;

    for (const integration of integrations) {
      const ownerId = integration.owner_id;

      let token: string | null;
      try {
        token = await step.run(`get-token-${ownerId}`, () => getGoogleCalendarAccessToken(supabase, ownerId));
      } catch {
        await step.run(`mark-calendar-error-${ownerId}`, () =>
          updateIntegration(supabase, integration.id, { status: "error" })
        );
        continue;
      }
      if (!token) continue;

      const events = await step.run(`list-events-${ownerId}`, () =>
        listUpcomingEvents(token!, { timeMinISO, timeMaxISO })
      );

      for (const evt of events) {
        const result = await step.run(`sync-event-${ownerId}-${evt.googleEventId}`, async () => {
          const { data: existing, error: existingError } = await supabase
            .from("meetings")
            .select("id")
            .eq("owner_id", ownerId)
            .eq("google_event_id", evt.googleEventId)
            .maybeSingle();
          if (existingError) throw existingError;
          if (existing) return { created: false };

          let clientId: string | null = null;
          if (evt.attendeeEmails.length > 0) {
            const { data: contacts, error: contactError } = await supabase
              .from("client_contacts")
              .select("client_id")
              .eq("owner_id", ownerId)
              .in("email", evt.attendeeEmails);
            if (contactError) throw contactError;
            clientId = contacts[0]?.client_id ?? null;
          }
          const knownClient = clientId !== null;

          let skribbyBotId: string | null = null;
          if (knownClient) {
            const bot = await createSkribbyBot({ meetingUrl: evt.videoLink });
            skribbyBotId = bot.id;
          }

          const meeting = await createMeeting(supabase, {
            owner_id: ownerId,
            client_id: clientId,
            title: evt.title,
            source: "bot_skribby",
            transcript_source: null,
            status: "scheduled",
            failure_reason: null,
            skribby_bot_id: skribbyBotId,
            draft_tickets: [],
            starts_at: evt.startsAt,
            known_client: knownClient,
            guest_email: evt.attendeeEmails[0] ?? null,
            transcript_text: null,
            google_event_id: evt.googleEventId,
            meeting_url: evt.videoLink,
          });

          if (knownClient) {
            await inngest.send({ name: "meeting/confirmed", data: { meetingId: meeting.id } });
          }
          return { created: true };
        });
        if (result.created) createdCount++;
      }
    }

    return { calendarsSynced: integrations.length, meetingsCreated: createdCount };
  }
);
